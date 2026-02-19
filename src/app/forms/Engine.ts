/**
 * @packageDocumentation
 *
 * Core engine logic for managing form state.
 */

import { useCallback, useMemo, useState } from "react";
import type {
  DeniedOperations,
  TypeInfo,
} from "../../common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import {
  ERROR_MESSAGE_CONSTANTS,
  getNoErrorDescriptor,
  type FieldValueValidatorMap,
  type ErrorDescriptor,
  type TypeInfoValidationResults,
  validateTypeInfoDataItem,
} from "../../common/TypeParsing/Validation";
import type {
  FormController,
  FormFieldController,
  FormValue,
  FormValues,
  TranslateValidationErrorCode,
} from "./types";

/**
 * Resolve whether an operation is denied, accounting for enum key casing.
 *
 * @param deniedOperations - Map of denied operations from tags.
 * @param operation - Operation to check.
 * @returns True if the operation is denied.
 */
const getDeniedOperation = (
  deniedOperations: DeniedOperations | undefined,
  operation: TypeOperation,
) => {
  if (!deniedOperations) {
    return false;
  }

  const denied = deniedOperations[operation];
  if (typeof denied === "boolean") {
    return denied;
  }

  return (
    deniedOperations[operation.toLowerCase() as keyof DeniedOperations] ?? false
  );
};

/**
 * Build initial values by applying defaults and non-optional fallbacks.
 *
 * @param initialValues - Starting values provided by callers.
 * @param typeInfo - Type metadata for fields.
 * @returns Normalized initial values with defaults applied.
 */
const buildInitialValues = (
  initialValues: FormValues,
  typeInfo: TypeInfo,
): FormValues => {
  const values: FormValues = { ...initialValues };

  for (const [key, field] of Object.entries(typeInfo.fields ?? {})) {
    if (values[key] !== undefined) {
      continue;
    }

    const defaultValue = field.tags?.constraints?.defaultValue;

    if (defaultValue !== undefined) {
      let parsedDefaultValue: FormValue | undefined = defaultValue;

      try {
        parsedDefaultValue = JSON.parse(defaultValue);
      } catch (error) {
        // Ignore.
      }

      values[key] = parsedDefaultValue;
      continue;
    }

    if (field.array && !field.typeReference && !field.optional) {
      values[key] = [];
      continue;
    }

    if (field.type === "boolean" && !field.optional) {
      values[key] = false;
    }
  }

  return values;
};

/**
 * Default translation from error descriptors to readable messages.
 *
 * @param error - Validation error descriptor.
 * @returns Message suitable for form UI.
 */
const defaultTranslateValidationErrorCode: TranslateValidationErrorCode = (
  error: ErrorDescriptor,
) => {
  const { code, values = [] } = error;
  const [constraintValue] = values;

  switch (code) {
    case ERROR_MESSAGE_CONSTANTS.MISSING:
      return "This field is required";
    case ERROR_MESSAGE_CONSTANTS.VALUE_DOES_NOT_MATCH_PATTERN:
      return "Value does not match required pattern";
    case ERROR_MESSAGE_CONSTANTS.VALUE_BELOW_MINIMUM:
      return `Value must be at least ${constraintValue ?? "the minimum"}`;
    case ERROR_MESSAGE_CONSTANTS.VALUE_ABOVE_MAXIMUM:
      return `Value must be at most ${constraintValue ?? "the maximum"}`;
    case ERROR_MESSAGE_CONSTANTS.INVALID_OPTION:
      return "Value is not one of the allowed options";
    case ERROR_MESSAGE_CONSTANTS.INVALID_TYPE:
      return "Value has an invalid type";
    case ERROR_MESSAGE_CONSTANTS.NONE:
      return "";
    default:
      return code;
  }
};

const FORM_ENGINE_TYPE_NAME = "__AUTO_FORM__";

/**
 * Hook that derives form state and field controllers from type metadata.
 *
 * @param initialValues - Initial form values.
 * @param typeInfo - Type metadata for the form.
 * @param options - Optional behavior overrides.
 * @returns Form controller with state, fields, and validation helpers.
 */
export const useFormEngine = (
  initialValues: FormValues = {},
  typeInfo: TypeInfo,
  options?: {
    /** Operation to evaluate when deriving field state. */
    operation?: TypeOperation;
    /** Optional translator for validation error descriptors. */
    translateValidationErrorCode?: TranslateValidationErrorCode;
    /** Optional custom validators keyed by field name. */
    customValidatorMap?: FieldValueValidatorMap;
  },
): FormController => {
  const operation = options?.operation ?? TypeOperation.CREATE;
  const translateValidationErrorCode =
    options?.translateValidationErrorCode ?? defaultTranslateValidationErrorCode;
  const customValidatorMap = options?.customValidatorMap ?? {};
  const [values, setValues] = useState<FormValues>(
    buildInitialValues(initialValues, typeInfo),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldValue = useCallback((path: string, value: FormValue) => {
    setValues((prev) => {
      return {
        ...prev,
        [path]: value,
      };
    });
  }, []);

  const validate = useCallback((): TypeInfoValidationResults => {
    const fields = typeInfo.fields ?? {};
    const validationResults = validateTypeInfoDataItem(
      values,
      typeInfo,
      customValidatorMap,
      {
        typeName: FORM_ENGINE_TYPE_NAME,
        typeOperation: operation,
      },
    );

    const newErrors: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      const errorDescriptor =
        (validationResults.errorMap[key] ?? []).find(
          (descriptor) => descriptor.code !== ERROR_MESSAGE_CONSTANTS.NONE,
        ) ?? getNoErrorDescriptor();
      const translated = translateValidationErrorCode(errorDescriptor);
      if (translated) {
        newErrors[key] = translated;
      }
    }

    setErrors(newErrors);
    return validationResults;
  }, [typeInfo, values, operation, translateValidationErrorCode, customValidatorMap]);

  const fields = useMemo<FormFieldController[]>(() => {
    return Object.entries(typeInfo.fields ?? {}).map(([key, field]) => {
      const { tags } = field;
      const isPrimary = tags?.primaryField || typeInfo.primaryField === key;

      return {
        key,
        field,
        label: tags?.label ?? key,
        required: !field.optional,
        disabled:
          field.readonly ||
          getDeniedOperation(typeInfo.tags?.deniedOperations, operation) ||
          getDeniedOperation(tags?.deniedOperations, operation) ||
          (operation === TypeOperation.UPDATE && isPrimary),
        hidden: !!tags?.hidden,
        primary: isPrimary,
        format: tags?.format,
        constraints: tags?.constraints,
        value: values[key],
        onChange: (value: FormValue) => setFieldValue(key, value),
        error: errors[key],
      };
    });
  }, [typeInfo, values, errors, setFieldValue, operation]);

  return {
    typeInfo,
    typeTags: typeInfo.tags,
    operation,
    values,
    errors,
    fields,
    setFieldValue,
    validate,
    setErrors,
  };
};
