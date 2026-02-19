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

const getControllerScenarioData = () => {
  const objectHarness = buildHarness({ name: "Alpha" }, "name", false);
  const arrayHarness = buildHarness(["zero", "one"], 1, true);
  const missingArrayHarness = buildHarness(undefined, 1, true);
  const missingKeyHarness = buildHarness(undefined, "name", false);

  return {
    objectHarness,
    arrayHarness,
    missingArrayHarness,
    missingKeyHarness,
  };
};

export const runControllerObjectValueScenario = () => {
  const { objectHarness } = getControllerScenarioData();
  return objectHarness.getValue() ?? null;
};

export const runControllerObjectParentScenario = () => {
  const { objectHarness } = getControllerScenarioData();
  return objectHarness.getParent();
};

export const runControllerObjectChangesScenario = () => {
  const { objectHarness } = getControllerScenarioData();
  return objectHarness.getChanges();
};

export const runControllerArrayValueScenario = () => {
  const { arrayHarness } = getControllerScenarioData();
  return arrayHarness.getValue() ?? null;
};

export const runControllerArrayParentScenario = () => {
  const { arrayHarness } = getControllerScenarioData();
  return arrayHarness.getParent();
};

export const runControllerArrayChangesScenario = () => {
  const { arrayHarness } = getControllerScenarioData();
  return arrayHarness.getChanges();
};

export const runControllerMissingArrayValueScenario = () => {
  const { missingArrayHarness } = getControllerScenarioData();
  return missingArrayHarness.getValue() ?? null;
};

export const runControllerMissingArrayParentScenario = () => {
  const { missingArrayHarness } = getControllerScenarioData();
  return missingArrayHarness.getParent() ?? null;
};

export const runControllerMissingValueScenario = () => {
  const { missingKeyHarness } = getControllerScenarioData();
  return missingKeyHarness.getValue() ?? null;
};

export const runControllerMissingParentScenario = () => {
  const { missingKeyHarness } = getControllerScenarioData();
  return missingKeyHarness.getParent() ?? null;
};
