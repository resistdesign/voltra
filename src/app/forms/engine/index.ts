/**
 * @packageDocumentation
 *
 * Core engine logic for managing form state.
 */

import { useState, useCallback } from "react";
import { FormMetadata } from "../types.js";

export const useFormEngine = <T extends Record<string, any> = any>(
    initialValues: T = {} as T,
    schema: FormMetadata
) => {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setFieldValue = useCallback((path: string, value: any) => {
        setValues((prev) => {
            // Simplified deep set for trial run
            // In a real app, use lodash.set or similar for nested paths
            return {
                ...prev,
                [path]: value,
            };
        });
    }, []);

    const validate = useCallback(() => {
        // Basic validation based on schema
        const newErrors: Record<string, string> = {};
        for (const [key, field] of Object.entries(schema.rootFields)) {
            if (field.required && !values[key]) {
                newErrors[key] = "This field is required";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [schema, values]);

    return {
        values,
        errors,
        setFieldValue,
        validate,
    };
};
