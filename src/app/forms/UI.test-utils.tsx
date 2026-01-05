/**
 * @packageDocumentation
 *
 * Test helpers and scenarios for form UI components.
 */

import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { renderToString } from "react-dom/server";
import type { TypeInfoField } from "../../common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import type {
  CustomTypeActionPayload,
  FormController,
  RelationActionPayload,
} from "./types";
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
    return node.map(getTextContent).join("");
  }
  if (isElement(node)) {
    const element = node as AnyReactElement;
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
    node.forEach((child) => collectElements(child, predicate, results));
    return results;
  }
  if (!isElement(node)) {
    return results;
  }
  const element = node as AnyReactElement;
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
    singleHasManage: singleRender.includes(">Manage</button>"),
    singleHasManageRelated: singleRender.includes(">Manage Related</button>"),
    arrayHasManageRelated: arrayRender.includes(">Manage Related</button>"),
    arrayHasManage: arrayRender.includes(">Manage</button>"),
    singleHasRelationHint: singleRender.includes("Provide onRelationAction"),
  };
};

/**
 * Validate array field rendering and controls.
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
 */
export const runCustomTypeScenario = () => {
  const payloads: CustomTypeActionPayload[] = [];
  const onCustomTypeAction = (payload: CustomTypeActionPayload) => {
    payloads.push(payload);
  };

  const scalarElement = renderFieldElement(
    {
      type: "string",
      array: false,
      readonly: false,
      optional: false,
      tags: {
        customType: "Special",
      },
    },
    { onCustomTypeAction },
  );

  const scalarButton = findClickableByText(scalarElement, "Manage");
  scalarButton?.props?.onClick?.();

  const arrayElement = renderFieldElement(
    {
      type: "string",
      array: true,
      readonly: false,
      optional: false,
      tags: {
        customType: "Special",
      },
    },
    { onCustomTypeAction, value: ["alpha"] },
  );

  const addButton = findClickableByText(arrayElement, "Add Item");
  addButton?.props?.onClick?.();

  const scalarPayload = payloads[0];
  const arrayPayload = payloads[1];

  return {
    scalarAction: scalarPayload?.action ?? null,
    scalarCustomType: scalarPayload?.customType ?? null,
    arrayAction: arrayPayload?.action ?? null,
    arrayCustomType: arrayPayload?.customType ?? null,
    arrayValueIsArray: Array.isArray(arrayPayload?.value),
  };
};

/**
 * Validate relation actions include full paging flag when set.
 */
export const runRelationFullPagingScenario = () => {
  let payload: RelationActionPayload | null = null;
  const onRelationAction = (nextPayload: RelationActionPayload) => {
    payload = nextPayload;
  };

  const element = renderFieldElement(
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
    { onRelationAction },
  );

  const manageButton = findClickableByText(element, "Manage");
  manageButton?.props?.onClick?.();

  const relationPayload = payload as RelationActionPayload | null;

  return {
    action: relationPayload?.action ?? null,
    fullPaging: relationPayload?.fullPaging ?? null,
  };
};

/**
 * Validate hidden fields are omitted from AutoFormView output.
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
    validate: () => true,
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
