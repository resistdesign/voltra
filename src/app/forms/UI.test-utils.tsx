import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { TypeInfoField } from "../../common/TypeParsing/TypeInfo";
import { AutoField } from "./UI";

const renderField = (
  field: TypeInfoField,
  options?: {
    value?: unknown;
    disabled?: boolean;
    onRelationAction?: () => void;
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
    }),
  );

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
