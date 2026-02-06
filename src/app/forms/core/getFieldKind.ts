/**
 * @packageDocumentation
 *
 * Resolve the field kind used for renderer selection.
 */

import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import type { FieldKind } from "./types";

const hasSelectableValues = (field: TypeInfoField): boolean => {
  const possibleValues = field.possibleValues ?? [];
  return possibleValues.some(
    (value) => typeof value === "string" || typeof value === "number",
  );
};

/**
 * Derive a {@link FieldKind} from type info metadata.
 *
 * @param field - Field metadata to evaluate.
 * @returns Field kind for renderer selection.
 */
export const getFieldKind = (field: TypeInfoField): FieldKind => {
  if (field.typeReference) {
    return field.array ? "relation_array" : "relation_single";
  }

  if (field.tags?.customType) {
    return field.array ? "custom_array" : "custom_single";
  }

  if (field.array) {
    return "array";
  }

  if (hasSelectableValues(field)) {
    return "enum_select";
  }

  if (field.type === "boolean") {
    return "boolean";
  }

  if (field.type === "number") {
    return "number";
  }

  return "string";
};
