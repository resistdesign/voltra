/**
 * @packageDocumentation
 *
 * Test utilities for createAutoField.
 */

import type { TypeInfoField } from "../../../common/TypeParsing/TypeInfo";
import { getErrorDescriptor } from "../../../common/TypeParsing/Validation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createAutoField } from "./createAutoField";
import type { ComponentSuite, FieldRenderContext } from "./types";

const baseField: TypeInfoField = {
  type: "string",
  array: false,
  readonly: false,
  optional: false,
};

const kindSuite: ComponentSuite = {
  renderers: {
    string: () => createElement("span", { "data-kind": "string" }),
    number: () => createElement("span", { "data-kind": "number" }),
    boolean: () => createElement("span", { "data-kind": "boolean" }),
    enum_select: () => createElement("span", { "data-kind": "enum_select" }),
    array: () => createElement("span", { "data-kind": "array" }),
    relation_single: () =>
      createElement("span", { "data-kind": "relation_single" }),
    relation_array: () =>
      createElement("span", { "data-kind": "relation_array" }),
    custom_single: () => createElement("span", { "data-kind": "custom_single" }),
    custom_array: () => createElement("span", { "data-kind": "custom_array" }),
  },
};

/**
 * Validate renderer selection based on field metadata.
 */
export const runCreateAutoFieldSelectionScenario = () => {
  const autoField = createAutoField(kindSuite as any);
  const renderKind = (field: TypeInfoField, fieldKey: string, value: unknown) => {
    const html = renderToStaticMarkup(
      createElement(autoField, {
        field,
        fieldKey,
        value: value as any,
        onChange: () => undefined,
      }),
    );
    return (html.match(/data-kind=\"([^\"]+)\"/)?.[1] ?? "missing");
  };

  return {
    stringKind: renderKind({ ...baseField, type: "string" }, "title", "Hello"),
    numberKind: renderKind({ ...baseField, type: "number" }, "count", 3),
    booleanKind: renderKind({ ...baseField, type: "boolean" }, "active", true),
    enumKind: renderKind(
      {
        ...baseField,
        type: "string",
        possibleValues: ["alpha", "beta"],
      },
      "status",
      "alpha",
    ),
    arrayKind: renderKind({ ...baseField, type: "string", array: true }, "tags", ["a"]),
    relationSingleKind: renderKind(
      { ...baseField, type: "string", typeReference: "Widget" },
      "widget",
      undefined,
    ),
    relationArrayKind: renderKind(
      {
        ...baseField,
        type: "string",
        typeReference: "Widget",
        array: true,
      },
      "widgets",
      undefined,
    ),
    customSingleKind: renderKind(
      { ...baseField, tags: { customType: "Special" } },
      "custom",
      undefined,
    ),
    customArrayKind: renderKind(
      {
        ...baseField,
        array: true,
        tags: { customType: "Special" },
      },
      "customs",
      undefined,
    ),
  };
};

/**
 * Validate that context values are derived correctly.
 */
export const runCreateAutoFieldContextScenario = () => {
  let capturedContext: any = null;

  const suite: ComponentSuite = {
    renderers: {
      string: (context) => {
        capturedContext = context;
        return createElement("span", { "data-kind": "string" });
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

  renderToStaticMarkup(
    createElement(autoField, {
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
      error: getErrorDescriptor("Required"),
      disabled: true,
    }),
  );

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
    hasRenderField: typeof capturedContext?.renderField === "function",
  };
};

/**
 * Validate that renderField recurses through the same dispatcher.
 */
export const runCreateAutoFieldRecursionScenario = () => {
  const suite: ComponentSuite = {
    renderers: {
      string: (context) =>
        createElement("span", { "data-kind": `string:${context.fieldKey}` }),
      number: () => {
        throw new Error("Unexpected renderer");
      },
      boolean: () => {
        throw new Error("Unexpected renderer");
      },
      enum_select: () => {
        throw new Error("Unexpected renderer");
      },
      array: (context) =>
        createElement(
          "div",
          undefined,
          context.renderField({
            field: { ...context.field, array: false, tags: undefined },
            fieldKey: `${context.fieldKey}[0]`,
            value: "nested",
            onChange: () => undefined,
          }),
        ),
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
  const html = renderToStaticMarkup(
    createElement(autoField, {
      field: { ...baseField, type: "string", array: true },
      fieldKey: "tags",
      value: ["nested"],
      onChange: () => undefined,
    }),
  );

  return {
    nestedResult: html.includes("data-kind=\"string:tags[0]\""),
  };
};
