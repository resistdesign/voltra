/**
 * @packageDocumentation
 *
 * Test utilities for common barrel exports.
 */

import * as Common from "./index";

/**
 * Validate routing exports from the common barrel.
 */
export const runCommonIndexRoutingExportsScenario = () => {
  return {
    hasPATH_DELIMITER: "PATH_DELIMITER" in Common,
    hasGetPotentialJSONValue: "getPotentialJSONValue" in Common,
    hasGetPathArray: "getPathArray" in Common,
    hasGetPathString: "getPathString" in Common,
    hasMergeStringPaths: "mergeStringPaths" in Common,
    hasResolvePath: "resolvePath" in Common,
    hasResolveRouteAdapterPath: "resolveRouteAdapterPath" in Common,
    hasGetParamsAndTestPath: "getParamsAndTestPath" in Common,
  };
};

export const runCommonIndexHasPATHDelimiterScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasPATH_DELIMITER;

export const runCommonIndexHasGetPotentialJSONValueScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasGetPotentialJSONValue;

export const runCommonIndexHasGetPathArrayScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasGetPathArray;

export const runCommonIndexHasGetPathStringScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasGetPathString;

export const runCommonIndexHasMergeStringPathsScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasMergeStringPaths;

export const runCommonIndexHasResolvePathScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasResolvePath;

export const runCommonIndexHasResolveRouteAdapterPathScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasResolveRouteAdapterPath;

export const runCommonIndexHasGetParamsAndTestPathScenario = async () =>
  (await runCommonIndexRoutingExportsScenario()).hasGetParamsAndTestPath;
