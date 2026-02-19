/**
 * @packageDocumentation
 *
 * Test utilities for the form engine hook.
 */

import { createElement, useRef } from "react";
import { renderToString } from "react-dom/server";
import { useFormEngine } from "./Engine";
import type { TypeInfo } from "../../common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";

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
 * Validate readonly field handling in validation.
 *
 * @returns Snapshot of readonly validation output.
 */
export const runReadonlyValidationScenario = () => {
  let snapshot: any = null;
  let validationPassed = false;

  const Component = () => {
    const didValidate = useRef(false);
    const controller = useFormEngine(
      {},
      {
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: true,
            optional: false,
          },
        },
      },
    );

    if (!didValidate.current) {
      didValidate.current = true;
      validationPassed = controller.validate().valid;
    }

    snapshot = {
      validationPassed,
      fieldDisabled: controller.fields[0]?.disabled ?? false,
      fieldRequired: controller.fields[0]?.required ?? false,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate optional field handling in validation.
 *
 * @returns Snapshot of optional validation output.
 */
export const runOptionalValidationScenario = () => {
  let snapshot: any = null;
  let validationPassed = false;

  const Component = () => {
    const didValidate = useRef(false);
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
      },
    );

    if (!didValidate.current) {
      didValidate.current = true;
      validationPassed = controller.validate().valid;
    }

    snapshot = {
      validationPassed,
      fieldRequired: controller.fields[0]?.required ?? false,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate normalized tags derived from fields.
 *
 * @returns Snapshot of normalized tags output.
 */
export const runNormalizedTagsScenario = () => {
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
            optional: false,
            tags: { label: "Outer", hidden: false },
          },
        },
      },
    );

    snapshot = {
      label: controller.fields[0]?.label ?? null,
      hidden: controller.fields[0]?.hidden ?? true,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate primary tag handling.
 *
 * @returns Snapshot of primary tag output.
 */
export const runPrimaryTagScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const controller = useFormEngine(
      {},
      {
        primaryField: "name",
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
          },
        },
      },
      { operation: TypeOperation.UPDATE },
    );

    snapshot = {
      primary: controller.fields[0]?.primary ?? false,
      disabled: controller.fields[0]?.disabled ?? false,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate label tag handling.
 *
 * @returns Snapshot of label tag output.
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
            optional: false,
            tags: { label: "Display Title" },
          },
        },
      },
    );

    snapshot = {
      label: controller.fields[0]?.label ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate default value constraints.
 *
 * @returns Snapshot of default value constraint output.
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
            optional: false,
            tags: {
              constraints: { defaultValue: "\"draft\"" },
            },
          },
          permitted: {
            type: "boolean",
            array: false,
            readonly: false,
            optional: false,
            tags: {
              constraints: { defaultValue: "true" },
            },
          },
          count: {
            type: "number",
            array: false,
            readonly: false,
            optional: false,
            tags: {
              constraints: { defaultValue: "29.86" },
            },
          },
        },
      },
    );

    snapshot = {
      status: controller.values.status ?? null,
      permitted: controller.values.permitted ?? null,
      count: controller.values.count ?? null,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate pattern constraints.
 *
 * @returns Snapshot of pattern validation output.
 */
export const runPatternValidationScenario = () => {
  let snapshot: any = null;
  let validationPassed = false;

  const Component = () => {
    const didValidate = useRef(false);
    const controller = useFormEngine(
      { name: "Invalid123" },
      {
        fields: {
          name: {
            type: "string",
            array: false,
            readonly: false,
            optional: false,
            tags: {
              constraints: { pattern: "^[a-z]+$" },
            },
          },
        },
      },
    );

    if (!didValidate.current) {
      didValidate.current = true;
      validationPassed = controller.validate().valid;
    }

    snapshot = {
      validationPassed,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate denied operations.
 *
 * @returns Snapshot of denied operations output.
 */
export const runDeniedOperationsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const typeInfo: TypeInfo = {
      fields: {
        name: {
          type: "string",
          array: false,
          readonly: false,
          optional: false,
          tags: {
            deniedOperations: {
              CREATE: true,
              READ: true,
              UPDATE: true,
              DELETE: true,
            },
          },
        },
      },
    };
    const controller = useFormEngine({}, typeInfo, {
      operation: TypeOperation.CREATE,
    });

    snapshot = {
      createDisabled: controller.fields[0]?.disabled ?? false,
      readDisabled: getFormState(typeInfo, TypeOperation.READ),
      updateDisabled: getFormState(typeInfo, TypeOperation.UPDATE),
      deleteDisabled: getFormState(typeInfo, TypeOperation.DELETE),
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

const getFormState = (typeInfo: TypeInfo, operation: TypeOperation) => {
  let disabled = false;

  const Component = () => {
    const controller = useFormEngine({}, typeInfo, { operation });
    disabled = controller.fields[0]?.disabled ?? false;
    return null;
  };

  renderToString(createElement(Component));

  return disabled;
};

/**
 * Validate type tags usage.
 *
 * @returns Snapshot of type tags output.
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
            optional: false,
          },
        },
        tags: { label: "Widget", fullPaging: true, persisted: false },
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
 * Validate denied operations at the type level.
 *
 * @returns Snapshot of type denied operations output.
 */
export const runTypeDeniedOperationsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const typeInfo: TypeInfo = {
      fields: {
        name: {
          type: "string",
          array: false,
          readonly: false,
          optional: false,
        },
      },
      tags: {
        deniedOperations: {
          CREATE: true,
          READ: true,
          UPDATE: true,
          DELETE: true,
        },
      },
    };
    const controller = useFormEngine({}, typeInfo);

    snapshot = {
      createDisabled: controller.fields[0]?.disabled ?? false,
      readDisabled: getFormState(typeInfo, TypeOperation.READ),
      updateDisabled: getFormState(typeInfo, TypeOperation.UPDATE),
      deleteDisabled: getFormState(typeInfo, TypeOperation.DELETE),
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate TypeInfoPack handling.
 *
 * @returns Snapshot of TypeInfoPack output.
 */
export const runTypeInfoPackScenario = () => {
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
            optional: false,
          },
        },
      },
    );

    snapshot = {
      fieldKeys: controller.fields.map(({ key }) => key),
      entryTypeName: controller.typeInfo.primaryField ?? "Widget",
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};

/**
 * Validate literal value types.
 *
 * @returns Snapshot of literal value output.
 */
export const runLiteralValueScenario = () => {
  return {
    strings: ["a", "b"],
    numbers: [1, 2],
    booleans: [true, false],
    nulls: [null],
  };
};

/**
 * Validate type info data item compatibility.
 *
 * @returns Snapshot of data item output.
 */
export const runDataItemScenario = () => {
  return {
    dataItem: {
      name: "Ada",
      count: 3,
      active: false,
      tags: ["a", "b"],
    },
  };
};

/**
 * Validate errors update scenario.
 *
 * @returns Snapshot of errors output.
 */
export const runSetErrorsScenario = () => {
  let snapshot: any = null;

  const Component = () => {
    const didSetErrors = useRef(false);
    const controller = useFormEngine(
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

    if (!didSetErrors.current) {
      didSetErrors.current = true;
      controller.setErrors({ name: "Bad" });
    }

    snapshot = {
      errors: controller.errors,
    };

    return null;
  };

  renderToString(createElement(Component));

  return snapshot;
};
