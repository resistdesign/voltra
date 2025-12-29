/**
 * @packageDocumentation
 *
 * Debugging utilities for React hooks. Log which dependency indexes changed
 * between renders to diagnose unexpected re-renders.
 */
import { useEffect, useRef } from "react";

export const getChangedDependencyIndexes = (
  prevDeps: any[],
  nextDeps: any[],
): number[] =>
  nextDeps
    .map((dep, i) => (dep !== prevDeps[i] ? i : null))
    .filter((dep): dep is number => dep !== null);

/**
 * Examines the changes in the dependencies of a hook.
 * */
export const useDebugDependencies = (dependencies: any[]) => {
  const firstRender = useRef(true);
  const prevDeps = useRef(dependencies);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const changedDeps = getChangedDependencyIndexes(
      prevDeps.current,
      dependencies,
    );

    if (changedDeps.length > 0) {
      console.log("Changed dependencies:", changedDeps);
    }

    prevDeps.current = dependencies;
  }, dependencies);
};
