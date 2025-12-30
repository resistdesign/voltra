import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useController } from "./Controller";

type ControllerHarness = {
  getValue: () => any;
  getParent: () => any;
  getChanges: () => any[];
};

const buildHarness = (
  initialParent: any,
  key: string | number,
  isArrayIndex: boolean,
): ControllerHarness => {
  let currentParent = initialParent;
  let currentValue: any = null;
  const changes: any[] = [];
  let onChangeRef: ((value: any) => void) | undefined;

  const Component = () => {
    const [value, onChange] = useController(
      currentParent,
      key,
      (nextValue) => {
        currentParent = nextValue;
        changes.push(nextValue);
      },
      isArrayIndex,
    );

    currentValue = value;
    onChangeRef = onChange;
    return null;
  };

  renderToString(createElement(Component));

  if (onChangeRef) {
    onChangeRef(isArrayIndex ? "next" : "updated");
    currentValue = currentParent ? currentParent[key] : undefined;
  }

  return {
    getValue: () => currentValue,
    getParent: () => currentParent,
    getChanges: () => changes,
  };
};

export const runControllerScenario = () => {
  const objectHarness = buildHarness({ name: "Alpha" }, "name", false);
  const arrayHarness = buildHarness(["zero", "one"], 1, true);
  const missingKeyHarness = buildHarness(undefined, "name", false);

  return {
    objectValue: objectHarness.getValue() ?? null,
    objectParent: objectHarness.getParent(),
    objectChanges: objectHarness.getChanges(),
    arrayValue: arrayHarness.getValue() ?? null,
    arrayParent: arrayHarness.getParent(),
    arrayChanges: arrayHarness.getChanges(),
    missingValue: missingKeyHarness.getValue() ?? null,
    missingParent: missingKeyHarness.getParent() ?? null,
  };
};
