import { useEffect, useRef } from "react";

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

    const changedDeps = dependencies
      .map((dep, i) => {
        if (dep !== prevDeps.current[i]) {
          return i;
        }
        return null;
      })
      .filter((dep) => dep !== null);

    if (changedDeps.length > 0) {
      console.log("Changed dependencies:", changedDeps);
    }

    prevDeps.current = dependencies;
  }, dependencies);
};
