import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useFormEngine } from "./Engine";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import type { FormController } from "./types";

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
        unionFieldSets: [["first", "second"], ["third"]],
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

export const runReadonlyValidationScenario = () => {
  let controller: FormController | undefined;

  const Component = () => {
    controller = useFormEngine(
      {},
      {
        fields: {
          locked: {
            type: "string",
            array: false,
            readonly: true,
            optional: false,
          },
        },
      },
    );

    return null;
  };

  renderToString(createElement(Component));

  if (!controller) {
    throw new Error("Expected controller to be initialized.");
  }

  const validationPassed = controller.validate();
  const field = controller.fields[0];

  return {
    validationPassed,
    fieldDisabled: field?.disabled ?? null,
    fieldRequired: field?.required ?? null,
  };
};

export const runOptionalValidationScenario = () => {
  let controller: FormController | undefined;

  const Component = () => {
    controller = useFormEngine(
      {},
      {
        fields: {
          nickname: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
          },
        },
      },
    );

    return null;
  };

  renderToString(createElement(Component));

  if (!controller) {
    throw new Error("Expected controller to be initialized.");
  }

  const validationPassed = controller.validate();
  const field = controller.fields[0];

  return {
    validationPassed,
    fieldRequired: field?.required ?? null,
  };
};

export const runNormalizedTagsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        fields: {
          title: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
            tags: {
              label: "Outer",
            },
          },
        },
      },
    );

    const field = controller.fields[0];

    snapshot = {
      label: field?.label ?? null,
      hidden: field?.hidden ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};
