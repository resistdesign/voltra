/**
 * @packageDocumentation
 *
 * Logic to parse generic TypeInfo into FormMetadata.
 */

import { FormMetadata, FieldMetadata } from "../types.js";

/**
 * Parses a raw TypeInfo-like object into normalized FormMetadata.
 *
 * @remarks
 * This is a simplified implementation for the trial run. In a real scenario,
 * this would handle deeper type introspection and validation.
 */
export const parseSchema = (typeInfo: any): FormMetadata => {
    const rootFields: Record<string, FieldMetadata> = {};

    if (!typeInfo || typeof typeInfo !== "object") {
        return { rootFields: {} };
    }

    const source = typeInfo.fields || typeInfo;

    for (const [key, value] of Object.entries(source)) {
        rootFields[key] = parseField(key, value);
    }

    return { rootFields };
};

const parseField = (key: string, value: any): FieldMetadata => {
    // Check for @label tag in TypeInfo
    const label = value.tags?.label || value.label || key;

    const base: FieldMetadata = {
        key,
        label,
        type: "string", // Default
    };

    if (value.array) {
        base.type = "array";
        // Create item metadata by stripping off the array flag
        // We use a generic key/label since it's an item in a list
        base.itemMetadata = parseField("item", { ...value, array: false, label: undefined });
    } else if (value.type === "string") {
        base.type = "string";
    } else if (value.type === "number") {
        base.type = "number";
    } else if (value.type === "boolean") {
        base.type = "boolean";
    } else if (value.type === "object" && value.fields) {
        base.type = "object";
        base.fields = {};
        for (const [subKey, subValue] of Object.entries(value.fields)) {
            base.fields[subKey] = parseField(subKey, subValue);
        }
    }

    if (value.required) {
        base.required = true;
    }

    if (value.description) {
        base.description = value.description;
    }

    if (value.possibleValues) {
        base.allowedValues = value.possibleValues;
    } else if (value.allowedValues) {
        // Fallback for older/mock schema formats
        base.allowedValues = value.allowedValues;
    }

    if (value.tags?.allowCustomSelection) {
        base.allowCustom = true;
    }

    return base;
};
