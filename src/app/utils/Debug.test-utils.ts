import { getChangedDependencyIndexes } from "./Debug";

export const runDebugScenario = () => {
  const unchanged = getChangedDependencyIndexes([1, "a"], [1, "a"]);
  const changed = getChangedDependencyIndexes([1, "a", true], [1, "b", false]);
  const added = getChangedDependencyIndexes([1], [1, 2, 3]);
  const removed = getChangedDependencyIndexes([1, 2, 3], [1]);

  return {
    unchanged,
    changed,
    added,
    removed,
  };
};
