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

export const runApplicationStateStructureScenario = () => {
  const { identifierA, identifierB, stateWithBoth } =
    getApplicationStateScenarioData();
  return getApplicationStateValueStructure(
    { first: identifierA, second: identifierB },
    stateWithBoth,
  );
};
