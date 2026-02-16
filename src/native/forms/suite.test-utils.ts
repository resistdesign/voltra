/**
 * @packageDocumentation
 *
 * Test utilities for the default native form suite.
 */

import type { FieldKind } from "../../app/forms/core";
import { nativeSuite } from "./suite";
import { createRequire } from "module";

const fieldKinds: FieldKind[] = [
  "string",
  "number",
  "boolean",
  "enum_select",
  "array",
  "relation_single",
  "relation_array",
  "custom_single",
  "custom_array",
];

/**
 * Ensure the native suite provides a renderer for every field kind.
 */
export const runNativeSuiteCompletenessScenario = () => {
  const missingKinds = fieldKinds.filter(
    (kind) => !nativeSuite.renderers[kind],
  );

  return {
    missingKinds,
  };
};

/**
 * Validate native suite primitives for platform-aware submit behavior.
 */
export const runNativeSuitePrimitiveSubmitScenario = () => {
  const nodeRequire = createRequire(import.meta.url);
  const anyModule = nodeRequire("module") as any;
  const previousRequire = (globalThis as any).require;
  const originalLoad = anyModule._load;
  let currentOS = "web";

  const fakeNative = {
    Platform: {
      get OS() {
        return currentOS;
      },
    },
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    TextInput: "TextInput",
    Switch: "Switch",
  };

  anyModule._load = function (
    request: string,
    parent: unknown,
    isMain: boolean,
  ) {
    if (request === "react-native") {
      return fakeNative;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    (globalThis as any).require = nodeRequire;
    const primitives = nativeSuite.primitives as NonNullable<
      typeof nativeSuite.primitives
    >;

    let submitCalls = 0;
    const webRoot = primitives.FormRoot?.({
      children: null as any,
      onSubmit: () => {
        submitCalls += 1;
      },
    }) as any;

    webRoot.props.onSubmit({ preventDefault: () => {} });

    currentOS = "ios";
    const nativeRoot = primitives.FormRoot?.({
      children: null as any,
      onSubmit: () => {},
    }) as any;

    let pressCalls = 0;
    const button = primitives.Button?.({
      children: "Submit" as any,
      onClick: () => {
        pressCalls += 1;
      },
    }) as any;

    button.props.onPress();

    return {
      webRootType: webRoot.type ?? null,
      webSubmitCalls: submitCalls,
      nativeRootType: nativeRoot.type ?? null,
      buttonTypeIsFunction: typeof button.type === "function",
      buttonPressCalls: pressCalls,
    };
  } finally {
    (globalThis as any).require = previousRequire;
    anyModule._load = originalLoad;
  }
};
