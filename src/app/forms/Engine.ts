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
  getArrayItemErrorMap,
  getErrorDescriptor,
  getErrorDescriptors,
  getNoErrorDescriptor,
  type FieldValueValidatorMap,
  type ErrorDescriptor,
  type TypeInfoValidationResults,
  validateTypeInfoDataItem,
} from "../../common/TypeParsing/Validation";
import type {
  FormController,
  FormErrorInputMap,
  FormErrorMap,
  FormFieldController,
  FormValue,
  FormValues,
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
    /** Optional custom validators keyed by field name. */
    customValidatorMap?: FieldValueValidatorMap;
  },
): FormController => {
  const operation = options?.operation ?? TypeOperation.CREATE;
  const customValidatorMap = options?.customValidatorMap ?? {};
  const [values, setValues] = useState<FormValues>(
    buildInitialValues(initialValues, typeInfo),
  );
  const [errors, setErrorsState] = useState<FormErrorMap>({});

  const normalizeErrorEntries = useCallback(
    (value: FormErrorInputMap[string]): FormErrorMap[string] => {
      if (typeof value === "string") {
        return [getErrorDescriptor(value)];
      }

      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === "object") {
        if ("code" in value && typeof value.code === "string") {
          return [value as ErrorDescriptor];
        }

        const itemErrorMap = value as Record<string, unknown>;
        const numericKeys = Object.keys(itemErrorMap).filter((key) =>
          /^\d+$/.test(key),
        );

        if (numericKeys.length) {
          const normalizedItemErrorMap: Record<number, ErrorDescriptor[]> = {};

          for (const key of numericKeys) {
            const index = Number(key);
            const rawValue = itemErrorMap[key];
            if (!Array.isArray(rawValue)) {
              continue;
            }
            normalizedItemErrorMap[index] = rawValue.filter(
              (descriptor): descriptor is ErrorDescriptor =>
                !!descriptor &&
                typeof descriptor === "object" &&
                "code" in descriptor &&
                typeof descriptor.code === "string",
            );
          }

          return [{ itemErrorMap: normalizedItemErrorMap }];
        }
      }

      return [getNoErrorDescriptor()];
    },
    [],
  );

  const normalizeErrorMap = useCallback(
    (pendingErrors: FormErrorInputMap): FormErrorMap =>
      Object.entries(pendingErrors).reduce((acc, [key, value]) => {
        acc[key] = normalizeErrorEntries(value);
        return acc;
      }, {} as FormErrorMap),
    [normalizeErrorEntries],
  );

  const setErrors = useCallback(
    (pendingErrors: FormErrorInputMap) => {
      setErrorsState(normalizeErrorMap(pendingErrors));
    },
    [normalizeErrorMap],
  );

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

    const newErrors: FormErrorMap = {};
    for (const key of Object.keys(fields)) {
      newErrors[key] = validationResults.errorMap[key] ?? [getNoErrorDescriptor()];
    }

    setErrorsState(newErrors);
    return validationResults;
  }, [typeInfo, values, operation, customValidatorMap]);

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
        error:
          getErrorDescriptors(errors[key] ?? []).find(
            (descriptor) => descriptor.code !== ERROR_MESSAGE_CONSTANTS.NONE,
          ) ?? getNoErrorDescriptor(),
        errors: getErrorDescriptors(errors[key] ?? []),
        arrayItemErrorMap: getArrayItemErrorMap(errors[key] ?? []),
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
