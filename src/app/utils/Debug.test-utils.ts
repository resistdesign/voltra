import { getChangedDependencyIndexes } from "./Debug";

export const runDebugUnchangedScenario = () =>
  getChangedDependencyIndexes([1, "a"], [1, "a"]);

export const runDebugChangedScenario = () =>
  getChangedDependencyIndexes([1, "a", true], [1, "b", false]);

export const runDebugAddedScenario = () =>
  getChangedDependencyIndexes([1], [1, 2, 3]);

export const runDebugRemovedScenario = () =>
  getChangedDependencyIndexes([1, 2, 3], [1]);
