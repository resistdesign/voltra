import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useFormEngine } from "./Engine";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo.js";

export const runFormControllerScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      { name: "Ada" },
      {
        primaryField: "name",
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
            tags: { label: "Name" },
          },
          age: {
            type: "number",
            array: false,
            readonly: false,
            optional: true,
          },
          email: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
            tags: {
              constraints: {
                defaultValue: "ada@example.com",
              },
            },
          },
          token: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
            tags: {
              hidden: true,
              deniedOperations: { UPDATE: true },
            },
          },
          status: {
            type: "string",
            array: false,
            readonly: true,
            optional: true,
          },
          active: {
            type: "boolean",
            array: false,
            readonly: false,
            optional: false,
          },
          tags: {
            type: "string",
            array: true,
            readonly: false,
            optional: false,
          },
        },
      },
      { operation: TypeOperation.UPDATE },
    );

    snapshot = {
      values: controller.values,
      fields: controller.fields.map(
        ({ key, label, required, value, disabled, hidden, primary }) => ({
        key,
        label,
        required,
        value: value ?? null,
        disabled,
        hidden,
        primary,
      }),
      ),
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

export const runFieldOrderScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        fields: {
          alpha: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
          },
          beta: {
            type: "number",
            array: false,
            readonly: false,
            optional: true,
          },
          gamma: {
            type: "boolean",
            array: false,
            readonly: false,
            optional: false,
          },
        },
      },
    );

    snapshot = controller.fields.map(({ key, field }) => ({
      key,
      type: field.type,
      array: field.array,
      optional: field.optional,
    }));

    return null;
  };

  renderToString(createElement(Component));

  return {
    fields: snapshot,
  };
};

export const runUnionFieldSetsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        fields: {
          first: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
          },
          second: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
          },
          third: {
            type: "number",
            array: false,
            readonly: false,
            optional: true,
          },
        },
        unionFieldSets: [
          ["first", "second"],
          ["third"],
        ],
      },
    );

    snapshot = controller.fields.map(({ key }) => key);

    return null;
  };

  renderToString(createElement(Component));

  return {
    fieldKeys: snapshot,
  };
};
