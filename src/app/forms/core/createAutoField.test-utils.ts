/**
 * @packageDocumentation
 *
 * Test utilities for createAutoField.
 */

import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import { createAutoField } from "./createAutoField";
import type { ComponentSuite, FieldRenderContext } from "./types";

const baseField: TypeInfoField = {
  type: "string",
  array: false,
  readonly: false,
  optional: false,
};

const kindSuite: ComponentSuite<string> = {
  renderers: {
    string: () => "string",
    number: () => "number",
    boolean: () => "boolean",
    enum_select: () => "enum_select",
    array: () => "array",
    relation_single: () => "relation_single",
    relation_array: () => "relation_array",
    custom_single: () => "custom_single",
    custom_array: () => "custom_array",
  },
};

/**
 * Validate renderer selection based on field metadata.
 */
export const runCreateAutoFieldSelectionScenario = () => {
  const autoField = createAutoField(kindSuite as any);

  return {
    stringKind: autoField({
      field: { ...baseField, type: "string" },
      fieldKey: "title",
      value: "Hello",
      onChange: () => undefined,
    }),
    numberKind: autoField({
      field: { ...baseField, type: "number" },
      fieldKey: "count",
      value: 3,
      onChange: () => undefined,
    }),
    booleanKind: autoField({
      field: { ...baseField, type: "boolean" },
      fieldKey: "active",
      value: true,
      onChange: () => undefined,
    }),
    enumKind: autoField({
      field: {
        ...baseField,
        type: "string",
        possibleValues: ["alpha", "beta"],
      },
      fieldKey: "status",
      value: "alpha",
      onChange: () => undefined,
    }),
    arrayKind: autoField({
      field: { ...baseField, type: "string", array: true },
      fieldKey: "tags",
      value: ["a"],
      onChange: () => undefined,
    }),
    relationSingleKind: autoField({
      field: { ...baseField, type: "string", typeReference: "Widget" },
      fieldKey: "widget",
      value: undefined,
      onChange: () => undefined,
    }),
    relationArrayKind: autoField({
      field: {
        ...baseField,
        type: "string",
        typeReference: "Widget",
        array: true,
      },
      fieldKey: "widgets",
      value: undefined,
      onChange: () => undefined,
    }),
    customSingleKind: autoField({
      field: { ...baseField, tags: { customType: "Special" } },
      fieldKey: "custom",
      value: undefined,
      onChange: () => undefined,
    }),
    customArrayKind: autoField({
      field: {
        ...baseField,
        array: true,
        tags: { customType: "Special" },
      },
      fieldKey: "customs",
      value: undefined,
      onChange: () => undefined,
    }),
  };
};

/**
 * Validate that context values are derived correctly.
 */
export const runCreateAutoFieldContextScenario = () => {
  let capturedContext: any = null;

  const suite: ComponentSuite<FieldRenderContext> = {
    renderers: {
      string: (context) => {
        capturedContext = context;
        return context;
      },
      number: () => {
        throw new Error("Unexpected renderer");
      },
      boolean: () => {
        throw new Error("Unexpected renderer");
      },
      enum_select: () => {
        throw new Error("Unexpected renderer");
      },
      array: () => {
        throw new Error("Unexpected renderer");
      },
      relation_single: () => {
        throw new Error("Unexpected renderer");
      },
      relation_array: () => {
        throw new Error("Unexpected renderer");
      },
      custom_single: () => {
        throw new Error("Unexpected renderer");
      },
      custom_array: () => {
        throw new Error("Unexpected renderer");
      },
    },
  };

  const autoField = createAutoField(suite as any);

  autoField({
    field: {
      ...baseField,
      tags: {
        label: "Display Name",
        allowCustomSelection: true,
        format: "email",
        constraints: { pattern: "[a-z]+" },
      },
    },
    fieldKey: "name",
    value: "Ada",
    onChange: () => undefined,
    error: "Required",
    disabled: true,
  });

  return {
    label: capturedContext?.label,
    required: capturedContext?.required,
    disabled: capturedContext?.disabled,
    error: capturedContext?.error,
    value: capturedContext?.value,
    allowCustomSelection: capturedContext?.allowCustomSelection,
    format: capturedContext?.format,
    hasConstraints: !!capturedContext?.constraints,
    hasPossibleValues: Array.isArray(capturedContext?.possibleValues),
    customType: capturedContext?.customType ?? null,
  };
};
