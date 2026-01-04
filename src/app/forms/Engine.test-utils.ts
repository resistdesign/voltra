import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useFormEngine } from "./Engine";

export const runFormControllerScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      { name: "Ada" },
      {
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
        },
      },
    );

    snapshot = {
      values: controller.values,
      fields: controller.fields.map(({ key, label, required, value }) => ({
        key,
        label,
        required,
        value: value ?? null,
      })),
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};
