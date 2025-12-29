import {
  getApplicationStateIdentifier,
  getApplicationStateModified,
  getApplicationStateValue,
  getApplicationStateValueStructure,
  setApplicationStateModified,
  setApplicationStateValue,
  type ApplicationState,
  type ApplicationStateIdentifier,
  type ApplicationStateModificationState,
} from "./ApplicationState";

export const runApplicationStateScenario = () => {
  const identifierA: ApplicationStateIdentifier = { screen: { profile: {} } };
  const identifierB: ApplicationStateIdentifier = { screen: { settings: {} } };
  const identifierC = getApplicationStateIdentifier();
  const identifierD = getApplicationStateIdentifier(identifierA);

  const initialState: ApplicationState = new Map();
  const initialModified: ApplicationStateModificationState = new Map();

  const stateWithA = setApplicationStateValue(identifierA, "alpha", initialState);
  const stateWithBoth = setApplicationStateValue(identifierB, "beta", stateWithA);

  const modifiedWithA = setApplicationStateModified(identifierA, true, initialModified);
  const modifiedWithBoth = setApplicationStateModified(identifierB, false, modifiedWithA);

  const valueA = getApplicationStateValue(identifierA, stateWithBoth);
  const valueB = getApplicationStateValue(identifierB, stateWithBoth);
  const modifiedA = getApplicationStateModified(identifierA, modifiedWithBoth);
  const modifiedB = getApplicationStateModified(identifierB, modifiedWithBoth);

  const structure = getApplicationStateValueStructure(
    { first: identifierA, second: identifierB },
    stateWithBoth,
  );

  return {
    identifierCIsEmpty: Object.keys(identifierC).length === 0,
    identifierDSameRef: identifierD === identifierA,
    valueA,
    valueB,
    modifiedA,
    modifiedB,
    structure,
  };
};
