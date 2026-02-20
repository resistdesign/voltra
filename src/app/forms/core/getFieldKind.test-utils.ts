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

export const runGetFieldKindStringScenario = () =>
  getFieldKind({ ...baseField, type: "string" });

export const runGetFieldKindNumberScenario = () =>
  getFieldKind({ ...baseField, type: "number" });

export const runGetFieldKindBooleanScenario = () =>
  getFieldKind({ ...baseField, type: "boolean" });

export const runGetFieldKindEnumScenario = () =>
  getFieldKind({
    ...baseField,
    type: "string",
    possibleValues: ["alpha", "beta"],
  });

export const runGetFieldKindArrayScenario = () =>
  getFieldKind({
    ...baseField,
    type: "string",
    array: true,
  });

export const runGetFieldKindRelationSingleScenario = () =>
  getFieldKind({
    ...baseField,
    type: "string",
    typeReference: "Widget",
  });

export const runGetFieldKindRelationArrayScenario = () =>
  getFieldKind({
    ...baseField,
    type: "string",
    typeReference: "Widget",
    array: true,
  });

export const runGetFieldKindCustomSingleScenario = () =>
  getFieldKind({
    ...baseField,
    type: "string",
    tags: { customType: "Special" },
  });

export const runGetFieldKindCustomArrayScenario = () =>
  getFieldKind({
    ...baseField,
    type: "string",
    array: true,
    tags: { customType: "Special" },
  });
