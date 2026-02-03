/**
 * @packageDocumentation
 *
 * Test utilities for the form engine hook.
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useFormEngine } from "./Engine";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import type { FormController } from "./types";

/**
 * Run a basic controller scenario covering defaults and derived field state.
 *
 * @returns Snapshot of derived values and field states.
 */
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

/**
 * Capture the field order emitted by the form engine.
 *
 * @returns Snapshot of field order for a basic type info map.
 */
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

/**
 * Capture field ordering for union field sets.
 *
 * @returns Snapshot of field ordering for union field sets.
 */
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

/**
 * Validate readonly field behavior and required validation.
 *
 * @returns Validation result and derived field state.
 */
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

/**
 * Validate optional field behavior for required checks.
 *
 * @returns Validation result and derived field state.
 */
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

/**
 * Validate normalized tags usage in label/hidden field settings.
 *
 * @returns Snapshot of normalized label and hidden flag.
 */
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

/**
 * Validate primary tag behavior for update operations.
 *
 * @returns Snapshot of primary and disabled state for update operations.
 */
export const runPrimaryTagScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        fields: {
          id: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
            tags: {
              primaryField: true,
            },
          },
        },
      },
      { operation: TypeOperation.UPDATE },
    );

    const field = controller.fields[0];

    snapshot = {
      primary: field?.primary ?? null,
      disabled: field?.disabled ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate label tag usage for fields.
 *
 * @returns Snapshot of label derived from tags.
 */
export const runLabelTagScenario = () => {
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
              label: "Display Title",
            },
          },
        },
      },
    );

    const field = controller.fields[0];

    snapshot = {
      label: field?.label ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate default value constraints applied to initial values.
 *
 * @returns Snapshot of values after default constraints.
 */
export const runDefaultValueConstraintScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        fields: {
          status: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
            tags: {
              constraints: {
                defaultValue: "draft",
              },
            },
          },
          permitted: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
            tags: {
              constraints: {
                defaultValue: "true",
              },
            },
          },
          count: {
            type: "number",
            array: false,
            readonly: false,
            optional: true,
            tags: {
              constraints: {
                defaultValue: "29.86",
              },
            },
          },
        },
      },
    );

    snapshot = controller.values;

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate regex-based pattern constraints during validation.
 *
 * @returns Validation result for pattern constraints.
 */
export const runPatternValidationScenario = () => {
  let controller: FormController | undefined;

  const Component = () => {
    controller = useFormEngine(
      { code: "abc" },
      {
        fields: {
          code: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
            tags: {
              constraints: {
                pattern: "^[A-Z]+$",
              },
            },
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

  return {
    validationPassed,
  };
};

/**
 * Validate field-level denied operations handling.
 *
 * @returns Snapshot of disabled flags across operations.
 */
export const runDeniedOperationsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const buildController = (operation: TypeOperation) =>
      useFormEngine(
        {},
        {
          fields: {
            name: {
              type: "string",
              array: false,
              readonly: false,
              optional: true,
              tags: {
                deniedOperations: {
                  [operation]: true,
                },
              },
            },
          },
        },
        { operation },
      );

    const createController = buildController(TypeOperation.CREATE);
    const readController = buildController(TypeOperation.READ);
    const updateController = buildController(TypeOperation.UPDATE);
    const deleteController = buildController(TypeOperation.DELETE);

    snapshot = {
      createDisabled: createController.fields[0]?.disabled ?? null,
      readDisabled: readController.fields[0]?.disabled ?? null,
      updateDisabled: updateController.fields[0]?.disabled ?? null,
      deleteDisabled: deleteController.fields[0]?.disabled ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate type tags passthrough on the controller.
 *
 * @returns Snapshot of type tags on the controller.
 */
export const runTypeTagsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
            optional: true,
          },
        },
        tags: {
          label: "Widget",
          fullPaging: true,
          persisted: false,
        },
      },
    );

    snapshot = {
      label: controller.typeTags?.label ?? null,
      fullPaging: controller.typeTags?.fullPaging ?? null,
      persisted: controller.typeTags?.persisted ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate type-level denied operations handling.
 *
 * @returns Snapshot of disabled flags for type-level denied ops.
 */
export const runTypeDeniedOperationsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const buildController = (operation: TypeOperation) =>
      useFormEngine(
        {},
        {
          fields: {
            name: {
              type: "string",
              array: false,
              readonly: false,
              optional: true,
            },
          },
          tags: {
            deniedOperations: {
              [operation]: true,
            },
          },
        },
        { operation },
      );

    const createController = buildController(TypeOperation.CREATE);
    const readController = buildController(TypeOperation.READ);
    const updateController = buildController(TypeOperation.UPDATE);
    const deleteController = buildController(TypeOperation.DELETE);

    snapshot = {
      createDisabled: createController.fields[0]?.disabled ?? null,
      readDisabled: readController.fields[0]?.disabled ?? null,
      updateDisabled: updateController.fields[0]?.disabled ?? null,
      deleteDisabled: deleteController.fields[0]?.disabled ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate field extraction from a packed type info map.
 *
 * @returns Snapshot of field keys and entry type name.
 */
export const runTypeInfoPackScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const typeInfoPack = {
      entryTypeName: "Widget",
      typeInfoMap: {
        Widget: {
          fields: {
            title: {
              type: "string",
              array: false,
              readonly: false,
              optional: false,
            },
          },
        },
        Other: {
          fields: {
            count: {
              type: "number",
              array: false,
              readonly: false,
              optional: true,
            },
          },
        },
      },
    } as const;

    const controller = useFormEngine(
      {},
      typeInfoPack.typeInfoMap[typeInfoPack.entryTypeName],
    );

    snapshot = {
      fieldKeys: controller.fields.map(({ key }) => key),
      entryTypeName: typeInfoPack.entryTypeName,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate literal value handling for initial values and validation.
 *
 * @returns Snapshot of values and validation result.
 */
export const runLiteralValueScenario = () => {
  let controller: FormController | undefined;

  const Component = () => {
    controller = useFormEngine(
      {
        name: "Ada",
        age: 42,
        active: true,
        note: null,
      },
      {
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
          },
          age: {
            type: "number",
            array: false,
            readonly: false,
            optional: false,
          },
          active: {
            type: "boolean",
            array: false,
            readonly: false,
            optional: false,
          },
          note: {
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

  return {
    values: {
      name: controller.values.name ?? null,
      age: controller.values.age ?? null,
      active: controller.values.active ?? null,
      note: controller.values.note ?? null,
    },
    validationPassed,
  };
};

/**
 * Validate array vs scalar value handling for data item shapes.
 *
 * @returns Snapshot of scalar/array values and array detection.
 */
export const runDataItemScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {
        name: "Nova",
        tags: ["alpha", "beta"],
      },
      {
        fields: {
          name: {
            type: "string",
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
    );

    snapshot = {
      scalarValue: controller.values.name ?? null,
      arrayValue: controller.values.tags ?? null,
      arrayIsArray: Array.isArray(controller.values.tags),
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate form controller exposes a setErrors helper.
 *
 * @returns Whether setErrors is available on the controller.
 */
export const runSetErrorsScenario = () => {
  let controller: FormController | undefined;

  const Component = () => {
    controller = useFormEngine(
      {},
      {
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
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

  return {
    hasSetErrors: typeof controller.setErrors === "function",
  };
};
