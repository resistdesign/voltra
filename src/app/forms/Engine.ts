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
import type {
  FormController,
  FormFieldController,
  FormValue,
  FormValues,
} from "./types";

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
      values[key] = defaultValue;
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

export const useFormEngine = (
  initialValues: FormValues = {},
  typeInfo: TypeInfo,
  options?: {
    operation?: TypeOperation;
  },
): FormController => {
  const operation = options?.operation ?? TypeOperation.CREATE;
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

  const validate = useCallback(() => {
    // Basic validation based on type info
    const newErrors: Record<string, string> = {};
    for (const [key, field] of Object.entries(typeInfo.fields ?? {})) {
      if (field.tags?.hidden) {
        continue;
      }

      const val = values[key];
      if (field.readonly && (val === undefined || val === null || val === "")) {
        continue;
      }
      const isMissing =
        val === undefined ||
        val === null ||
        val === "" ||
        (field.array && (!Array.isArray(val) || val.length === 0));
      if (!field.optional && isMissing) {
        newErrors[key] = "This field is required";
        continue;
      }

      if (isMissing) {
        continue;
      }

      const constraints = field.tags?.constraints;
      if (constraints?.pattern && typeof val === "string") {
        const pattern = new RegExp(constraints.pattern);
        if (!pattern.test(val)) {
          newErrors[key] = "Value does not match required pattern";
          continue;
        }
      }

      if (field.type === "number" && typeof val === "number") {
        if (constraints?.min !== undefined && val < constraints.min) {
          newErrors[key] = `Value must be at least ${constraints.min}`;
          continue;
        }
        if (constraints?.max !== undefined && val > constraints.max) {
          newErrors[key] = `Value must be at most ${constraints.max}`;
          continue;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [typeInfo, values]);

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
  };
};
