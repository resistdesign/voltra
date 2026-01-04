/**
 * @packageDocumentation
 *
 * Core engine logic for managing form state.
 */

import { useCallback, useMemo, useState } from "react";
import type { TypeInfo } from "../../common/TypeParsing/TypeInfo.js";
import type { FormController, FormFieldController } from "./types.js";

export const useFormEngine = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  initialValues: T = {} as T,
  typeInfo: TypeInfo,
): FormController => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldValue = useCallback((path: string, value: unknown) => {
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
      const val = values[key];
      const isMissing = val === undefined || val === null || val === "";
      if (!field.optional && isMissing) {
        newErrors[key] = "This field is required";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [typeInfo, values]);

  const fields = useMemo<FormFieldController[]>(() => {
    return Object.entries(typeInfo.fields ?? {}).map(([key, field]) => ({
      key,
      field,
      label: field.tags?.label ?? key,
      required: !field.optional,
      value: values[key],
      onChange: (value: unknown) => setFieldValue(key, value),
      error: errors[key],
    }));
  }, [typeInfo, values, errors, setFieldValue]);

  return {
    typeInfo,
    values,
    errors,
    fields,
    setFieldValue,
    validate,
  };
};
