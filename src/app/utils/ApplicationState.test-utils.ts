import {
  ApplicationStateContext,
  getApplicationStateIdentifier,
  getApplicationStateModified,
  getApplicationStateValue,
  setApplicationStateModified,
  setApplicationStateValue,
  useApplicationStateValue,
  type ApplicationState,
  type ApplicationStateIdentifier,
  type ApplicationStateModificationState,
  type ApplicationStateSetAction,
  type ApplicationStateValueController,
} from "./ApplicationState";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";

const getApplicationStateScenarioData = () => {
  const identifierA: ApplicationStateIdentifier = { screen: { profile: {} } };
  const identifierB: ApplicationStateIdentifier = { screen: { settings: {} } };
  const identifierC = getApplicationStateIdentifier();
  const identifierD = getApplicationStateIdentifier(identifierA);

  const initialState: ApplicationState = new Map();
  const initialModified: ApplicationStateModificationState = new Map();

  const stateWithA = setApplicationStateValue(
    identifierA,
    "alpha",
    initialState,
  );
  const stateWithBoth = setApplicationStateValue(
    identifierB,
    "beta",
    stateWithA,
  );

  const modifiedWithA = setApplicationStateModified(
    identifierA,
    true,
    initialModified,
  );
  const modifiedWithBoth = setApplicationStateModified(
    identifierB,
    false,
    modifiedWithA,
  );

  return {
    identifierA,
    identifierB,
    identifierC,
    identifierD,
    stateWithBoth,
    modifiedWithBoth,
  };
};

export const runApplicationStateIdentifierCIsEmptyScenario = () => {
  const { identifierC } = getApplicationStateScenarioData();
  return Object.keys(identifierC).length === 0;
};

export const runApplicationStateIdentifierDSameRefScenario = () => {
  const { identifierA, identifierD } = getApplicationStateScenarioData();
  return identifierD === identifierA;
};

export const runApplicationStateValueAScenario = () => {
  const { identifierA, stateWithBoth } = getApplicationStateScenarioData();
  return getApplicationStateValue(identifierA, stateWithBoth);
};

export const runApplicationStateValueBScenario = () => {
  const { identifierB, stateWithBoth } = getApplicationStateScenarioData();
  return getApplicationStateValue(identifierB, stateWithBoth);
};

export const runApplicationStateModifiedAScenario = () => {
  const { identifierA, modifiedWithBoth } = getApplicationStateScenarioData();
  return getApplicationStateModified(identifierA, modifiedWithBoth);
};

export const runApplicationStateModifiedBScenario = () => {
  const { identifierB, modifiedWithBoth } = getApplicationStateScenarioData();
  return getApplicationStateModified(identifierB, modifiedWithBoth);
};

const resolveStateAction = <ValueType,>(
  action: ApplicationStateSetAction<ValueType>,
  previousValue: ValueType,
): ValueType =>
  typeof action === "function"
    ? (action as (value: ValueType) => ValueType)(previousValue)
    : action;

const buildValueControllerHarness = <ValueType,>(
  identifier: ApplicationStateIdentifier<ValueType>,
) => {
  let controller: ApplicationStateValueController<ValueType> | undefined;
  let currentValue: ApplicationState = new Map();
  let currentModified: ApplicationStateModificationState = new Map();

  const setValue = (newValue: ApplicationStateSetAction<ApplicationState>) => {
    currentValue = resolveStateAction(newValue, currentValue);
  };
  const setModified = (
    newValue: ApplicationStateSetAction<ApplicationStateModificationState>,
  ) => {
    currentModified = resolveStateAction(newValue, currentModified);
  };

  const Component = () => {
    controller = useApplicationStateValue(identifier);
    return null;
  };

  renderToString(
    createElement(
      ApplicationStateContext.Provider,
      {
        value: {
          value: currentValue,
          modified: currentModified,
          onChange: setValue,
          setModified,
        },
      },
      createElement(Component),
    ),
  );

  if (!controller) {
    throw new Error("Failed to initialize application state value controller.");
  }

  return {
    controller,
    getValueState: () => currentValue,
    getModifiedState: () => currentModified,
  };
};

export const runApplicationStateValueFunctionalUpdateScenario = () => {
  const identifier = getApplicationStateIdentifier<number>();
  const harness = buildValueControllerHarness(identifier);

  harness.controller.onChange((previousValue = 0) => previousValue + 1);
  harness.controller.onChange((previousValue = 0) => previousValue + 1);

  return harness.getValueState().get(identifier);
};

export const runApplicationStateValueFunctionalUpdateModifiedScenario = () => {
  const identifier = getApplicationStateIdentifier<number>();
  const harness = buildValueControllerHarness(identifier);

  harness.controller.onChange((previousValue = 0) => previousValue + 1);

  return harness.getModifiedState().get(identifier);
};
