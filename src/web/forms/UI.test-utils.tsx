/**
 * @packageDocumentation
 *
 * Test helpers and scenarios for form UI components.
 */

import type { ReactElement, ReactNode } from "react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { TypeInfoField } from "../../common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptor,
  getNoErrorDescriptor,
} from "../../common/TypeParsing/Validation";
import type {
  CustomTypeActionPayload,
  FormController,
  RelationActionPayload,
} from "../../app/forms/types";
import { AutoField, AutoFormView } from "./UI";

/**
 * Render a single AutoField to an HTML string.
 *
 * @param field - Field metadata to render.
 * @param options - Optional render configuration.
 * @returns Rendered HTML string.
 */
const renderField = (
  field: TypeInfoField,
  options?: {
    value?: unknown;
    disabled?: boolean;
    onRelationAction?: (payload: RelationActionPayload) => void;
    onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
  },
) =>
  renderToString(
    createElement(AutoField, {
      field,
      fieldKey: "field",
      value: options?.value as any,
      onChange: () => {},
      disabled: options?.disabled,
      onRelationAction: options?.onRelationAction,
      onCustomTypeAction: options?.onCustomTypeAction,
    }),
  );

/**
 * Minimal props shape for element filtering helpers.
 */
type AnyProps = {
  children?: ReactNode;
  onClick?: () => void;
};

/**
 * React element type used for DOM-less tree inspection.
 */
type AnyReactElement = ReactElement<AnyProps, any>;

/**
 * Resolve function components in a ReactNode tree for static inspection.
 *
 * @param node - Node to resolve.
 * @returns Node with top-level function components expanded.
 */
const resolveNode = (node: ReactNode): ReactNode => {
  if (!isElement(node)) {
    return node;
  }

  if (typeof node.type === "function") {
    const rendered = (node.type as any)(node.props);
    return resolveNode(rendered);
  }

  return node;
};

/**
 * Render an AutoField to a React element tree.
 *
 * @param field - Field metadata to render.
 * @param options - Optional render configuration.
 * @returns ReactNode tree for inspection.
 */
const renderFieldElement = (
  field: TypeInfoField,
  options?: {
    value?: unknown;
    disabled?: boolean;
    onRelationAction?: (payload: RelationActionPayload) => void;
    onCustomTypeAction?: (payload: CustomTypeActionPayload) => void;
  },
): ReactNode =>
  AutoField({
    field,
    fieldKey: "field",
    value: options?.value as any,
    onChange: () => {},
    disabled: options?.disabled,
    onRelationAction: options?.onRelationAction,
    onCustomTypeAction: options?.onCustomTypeAction,
  }) as ReactNode;

/**
 * Narrow a ReactNode to a React element with props.
 *
 * @param node - Node to check.
 * @returns True when the node is a React element.
 */
const isElement = (node: ReactNode): node is AnyReactElement =>
  !!node && typeof node === "object" && "props" in node;

/**
 * Extract text content from a ReactNode tree.
 *
 * @param node - Node tree to flatten.
 * @returns Text content from the tree.
 */
const getTextContent = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => getTextContent(resolveNode(child))).join("");
  }
  const resolvedNode = resolveNode(node);
  if (isElement(resolvedNode)) {
    const element = resolvedNode as AnyReactElement;
    return getTextContent(element.props?.children);
  }
  return "";
};

/**
 * Collect matching elements from a ReactNode tree.
 *
 * @param node - Node tree to search.
 * @param predicate - Predicate applied to each element.
 * @param results - Accumulator for matching elements.
 * @returns Collected elements that match the predicate.
 */
const collectElements = (
  node: ReactNode,
  predicate: (element: AnyReactElement) => boolean,
  results: AnyReactElement[] = [],
) => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return results;
  }
  if (Array.isArray(node)) {
    node.forEach((child) =>
      collectElements(resolveNode(child), predicate, results),
    );
    return results;
  }
  const resolvedNode = resolveNode(node);
  if (!isElement(resolvedNode)) {
    return results;
  }
  const element = resolvedNode as AnyReactElement;
  if (predicate(element)) {
    results.push(element);
  }
  const children = element.props?.children;
  if (children !== undefined) {
    collectElements(children, predicate, results);
  }
  return results;
};

/**
 * Find the first clickable element containing target text.
 *
 * @param node - Node tree to search.
 * @param text - Text to match within clickable elements.
 * @returns First matching clickable element, if any.
 */
const findClickableByText = (node: ReactNode, text: string) => {
  const matches = collectElements(
    node,
    (element) =>
      typeof element.props?.onClick === "function" &&
      getTextContent(element).includes(text),
  );

  return matches[0];
};

/**
 * Validate base input rendering for primitive field types.
 *
 * @returns Render assertions for primitive input types.
 */
export const runPrimitiveInputScenario = () => {
  const stringRender = renderField({
    type: "string",
    array: false,
    readonly: false,
    optional: false,
  });

  const numberRender = renderField({
    type: "number",
    array: false,
    readonly: false,
    optional: false,
  });

  const booleanRender = renderField({
    type: "boolean",
    array: false,
    readonly: false,
    optional: false,
  });

  return {
    stringHasTextInput: stringRender.includes('type="text"'),
    numberHasNumberInput: numberRender.includes('type="number"'),
    booleanHasCheckbox: booleanRender.includes('type="checkbox"'),
  };
};

/**
 * Validate relation field rendering behavior.
 *
 * @returns Render assertions for relation fields.
 */
export const runRelationFieldScenario = () => {
  const onRelationAction = () => {};

  const singleRender = renderField(
    {
      type: "string",
      typeReference: "User",
      array: false,
      readonly: false,
      optional: false,
    },
    { onRelationAction },
  );

  const arrayRender = renderField(
    {
      type: "string",
      typeReference: "User",
      array: true,
      readonly: false,
      optional: false,
    },
    { onRelationAction },
  );

  return {
    singleHasManage: singleRender.includes('data-signifier="manage"'),
    singleHasManageRelated: singleRender.includes(
      'data-signifier="manage-related"',
    ),
    arrayHasManage: arrayRender.includes('data-signifier="manage"'),
    arrayHasManageRelated: arrayRender.includes(
      'data-signifier="manage-related"',
    ),
  };
};

/**
 * Validate array field rendering and controls.
 *
 * @returns Render assertions for array field controls.
 */
export const runArrayFieldScenario = () => {
  const arrayRender = renderField(
    {
      type: "string",
      array: true,
      readonly: false,
      optional: false,
    },
    { value: ["alpha"] },
  );

  return {
    hasAddItemButton: arrayRender.includes(">Add Item</button>"),
    hasRemoveButton: arrayRender.includes(">Remove</button>"),
    itemHasTextInput: arrayRender.includes('type="text"'),
  };
};

/**
 * Validate select rendering for possible values.
 *
 * @returns Render assertions for possible value selects.
 */
export const runPossibleValuesScenario = () => {
  const stringRender = renderField({
    type: "string",
    array: false,
    readonly: false,
    optional: false,
    possibleValues: ["alpha", "beta"],
  });

  const numberRender = renderField({
    type: "number",
    array: false,
    readonly: false,
    optional: false,
    possibleValues: [1, 2],
  });

  return {
    stringHasSelect: stringRender.includes("<select"),
    stringHasAlpha: stringRender.includes('value="alpha"'),
    stringHasBeta: stringRender.includes('value="beta"'),
    numberHasSelect: numberRender.includes("<select"),
    numberHasOne: numberRender.includes('value="1"'),
    numberHasTwo: numberRender.includes('value="2"'),
  };
};

/**
 * Validate filtering of boolean/null values from select options.
 *
 * @returns Render assertions for filtered possible values.
 */
export const runPossibleValuesFilterScenario = () => {
  const mixedRender = renderField({
    type: "string",
    array: false,
    readonly: false,
    optional: false,
    possibleValues: [true, null, "alpha", 2],
  });

  const hasTrueOption =
    mixedRender.includes('value="true"') || mixedRender.includes(">true<");
  const hasNullOption =
    mixedRender.includes('value="null"') || mixedRender.includes(">null<");

  return {
    hasAlphaOption: mixedRender.includes('value="alpha"'),
    hasNumberOption: mixedRender.includes('value="2"'),
    hasBooleanOption: hasTrueOption,
    hasNullOption,
  };
};

/**
 * Validate input type formatting based on tag format.
 *
 * @returns Render assertions for formatted input types.
 */
export const runFormatScenario = () => {
  const render = renderField({
    type: "string",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      format: "email",
    },
  });

  return {
    hasEmailType: render.includes('type="email"'),
  };
};

/**
 * Validate custom selection rendering with datalist.
 *
 * @returns Render assertions for custom selection UI.
 */
export const runAllowCustomSelectionScenario = () => {
  const render = renderField({
    type: "string",
    array: false,
    readonly: false,
    optional: false,
    possibleValues: ["alpha", "beta"],
    tags: {
      allowCustomSelection: true,
    },
  });

  return {
    hasDatalist: render.includes("<datalist"),
    hasListAttribute: render.includes('list="list-field-field"'),
  };
};

/**
 * Validate constraint attributes for number and string inputs.
 *
 * @returns Render assertions for constraint attributes.
 */
export const runConstraintAttributeScenario = () => {
  const numberRender = renderField({
    type: "number",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        min: 1,
        max: 5,
        step: 0.5,
      },
    },
  });

  const stringRender = renderField({
    type: "string",
    array: false,
    readonly: false,
    optional: false,
    tags: {
      constraints: {
        pattern: "^[A-Z]+$",
      },
    },
  });

  return {
    numberHasMin: numberRender.includes('min="1"'),
    numberHasMax: numberRender.includes('max="5"'),
    numberHasStep: numberRender.includes('step="0.5"'),
    stringHasPattern: stringRender.includes('pattern="^[A-Z]+$"'),
  };
};

/**
 * Validate custom type action payloads for scalar and array fields.
 *
 * @returns Captured action payload details for custom type actions.
 */
export const runCustomTypeScenario = () => {
  const scalarRender = renderField(
    {
      type: "string",
      array: false,
      readonly: false,
      optional: false,
      tags: {
        customType: "Special",
      },
    },
    { onCustomTypeAction: () => {} },
  );

  const arrayRender = renderField(
    {
      type: "string",
      array: true,
      readonly: false,
      optional: false,
      tags: {
        customType: "Special",
      },
    },
    { onCustomTypeAction: () => {}, value: ["alpha"] },
  );

  return {
    scalarHasManageButton: scalarRender.includes("Manage"),
    arrayHasAddItemButton: arrayRender.includes("Add Item"),
    arrayHasManageButton: arrayRender.includes("Manage"),
    arrayHasRemoveButton: arrayRender.includes("Remove"),
  };
};

/**
 * Validate relation actions include full paging flag when set.
 *
 * @returns Captured relation action payload details.
 */
export const runRelationFullPagingScenario = () => {
  const render = renderField(
    {
      type: "string",
      typeReference: "User",
      array: false,
      readonly: false,
      optional: false,
      tags: {
        fullPaging: true,
      },
    },
    { onRelationAction: () => {} },
  );

  return {
    hasManageButton: render.includes("Manage"),
    hasManageSignifier: render.includes("data-signifier=\"manage\""),
  };
};

/**
 * Validate AutoFormView disables submit when requested.
 *
 * @returns Whether the submit button is disabled.
 */
export const runSubmitDisabledScenario = () => {
  const controller: FormController = {
    typeInfo: { fields: {} },
    operation: TypeOperation.CREATE,
    values: {},
    errors: {},
    fields: [],
    setFieldValue: () => {},
    validate: () => ({
      typeName: "__TEST__",
      valid: true,
      error: getNoErrorDescriptor(),
      errorMap: {},
    }),
    setErrors: () => {},
  };

  const html = renderToString(
    createElement(AutoFormView, {
      controller,
      onSubmit: () => {},
      submitDisabled: true,
    }),
  );

  return {
    submitDisabled: html.includes("disabled"),
  };
};

/**
 * Validate hidden fields are omitted from AutoFormView output.
 *
 * @returns Render assertions for hidden vs visible fields.
 */
export const runHiddenFieldScenario = () => {
  const controller: FormController = {
    typeInfo: {},
    typeTags: undefined,
    operation: TypeOperation.CREATE,
    values: {},
    errors: {},
    fields: [
      {
        key: "visible",
        field: {
          type: "string",
          array: false,
          readonly: false,
          optional: true,
        },
        label: "Visible",
        required: false,
        disabled: false,
        hidden: false,
        primary: false,
        value: undefined,
        onChange: () => {},
      },
      {
        key: "secret",
        field: {
          type: "string",
          array: false,
          readonly: false,
          optional: true,
        },
        label: "Secret",
        required: false,
        disabled: false,
        hidden: true,
        primary: false,
        value: undefined,
        onChange: () => {},
      },
    ],
    setFieldValue: () => {},
    validate: () => ({
      typeName: "__TEST__",
      valid: true,
      error: getNoErrorDescriptor(),
      errorMap: {},
    }),
    setErrors: () => {},
  };

  const render = renderToString(
    createElement(AutoFormView, {
      controller,
      onSubmit: () => {},
    }),
  );

  return {
    hasVisibleField: render.includes("field-visible"),
    hasHiddenField: render.includes("field-secret"),
  };
};

/**
 * Validate multiple value-level errors render for one field.
 *
 * @returns Render assertions for multiple field errors.
 */
export const runMultipleValueErrorsScenario = () => {
  const render = renderToString(
    createElement(AutoField, {
      field: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      fieldKey: "field",
      value: "bad",
      onChange: () => {},
      errors: [
        getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.MISSING_FIELD_VALUE),
        getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.INVALID_CUSTOM_TYPE),
      ],
      translateValidationErrorCode: (error) => `msg:${error.code}`,
    }),
  );

  return {
    hasFirstError: render.includes("msg:MISSING_FIELD_VALUE"),
    hasSecondError: render.includes("msg:INVALID_CUSTOM_TYPE"),
  };
};

/**
 * Validate per-index array item errors render on nested array items.
 *
 * @returns Render assertions for array item errors.
 */
export const runArrayItemErrorsScenario = () => {
  const render = renderToString(
    createElement(AutoField, {
      field: {
        type: "string",
        array: true,
        readonly: false,
        optional: false,
      },
      fieldKey: "field",
      value: ["bad"],
      onChange: () => {},
      arrayItemErrorMap: {
        0: [
          getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.MISSING_FIELD_VALUE),
          getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.INVALID_CUSTOM_TYPE),
        ],
      },
      translateValidationErrorCode: (error) => `msg:${error.code}`,
    }),
  );

  return {
    hasItemFirstError: render.includes("msg:MISSING_FIELD_VALUE"),
    hasItemSecondError: render.includes("msg:INVALID_CUSTOM_TYPE"),
  };
};
