/**
 * @packageDocumentation
 *
 * Test utilities for getFieldKind.
 */

import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import { getFieldKind } from "./getFieldKind";

const baseField: TypeInfoField = {
  type: "string",
  array: false,
  readonly: false,
  optional: false,
};

/**
 * Run a scenario covering each field kind category.
 *
 * @returns Snapshot of resolved field kinds.
 */
export const runGetFieldKindScenario = () => {
  return {
    stringKind: getFieldKind({ ...baseField, type: "string" }),
    numberKind: getFieldKind({ ...baseField, type: "number" }),
    booleanKind: getFieldKind({ ...baseField, type: "boolean" }),
    enumKind: getFieldKind({
      ...baseField,
      type: "string",
      possibleValues: ["alpha", "beta"],
    }),
    arrayKind: getFieldKind({
      ...baseField,
      type: "string",
      array: true,
    }),
    relationSingleKind: getFieldKind({
      ...baseField,
      type: "string",
      typeReference: "Widget",
    }),
    relationArrayKind: getFieldKind({
      ...baseField,
      type: "string",
      typeReference: "Widget",
      array: true,
    }),
    customSingleKind: getFieldKind({
      ...baseField,
      type: "string",
      tags: { customType: "Special" },
    }),
    customArrayKind: getFieldKind({
      ...baseField,
      type: "string",
      array: true,
      tags: { customType: "Special" },
    }),
  };
};
