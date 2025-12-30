/**
 * Helpers for parsing and composing path strings used by the Router utilities.
 */
/**
 * The delimiter used to separate paths.
 */
export const PATH_DELIMITER = "/";

/**
 * Parse a string into JSON if possible, otherwise return the raw value.
 *
 * @param value - Input string to parse.
 * @returns Parsed JSON or the original string.
 */
export const getPotentialJSONValue = (value: string): any => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

/**
 * Get the path segments from a path string.
 *
 * @param path - Path string to split.
 * @param delimiter - Delimiter used to split the path.
 * @param filterEmptyOutput - Whether to remove empty output segments.
 * @param filterEmptyInput - Whether to remove empty input segments.
 * @param useJson - Whether to parse each segment as JSON.
 * @param uriDecodeParts - Whether to URI-decode each segment.
 * @returns Array of path segments.
 * */
export const getPathArray = (
  path: string,
  delimiter: string = PATH_DELIMITER,
  filterEmptyOutput: boolean = false,
  filterEmptyInput: boolean = true,
  useJson: boolean = true,
  uriDecodeParts: boolean = true,
): any[] =>
  path
    .split(delimiter)
    .filter(filterEmptyInput ? (p) => p !== "" : () => true)
    .map(uriDecodeParts ? decodeURIComponent : (x) => x)
    .map(useJson ? getPotentialJSONValue : (p) => p)
    .filter(filterEmptyOutput ? (p) => p ?? false : () => true);

/**
 * Get the path string from path segments.
 *
 * @param parts - Path segments to join.
 * @param delimiter - Delimiter used to join the path.
 * @param filterEmptyInput - Whether to remove empty input segments.
 * @param useJson - Whether to JSON-stringify each segment.
 * @param uriEncodeParts - Whether to URI-encode each segment.
 * @returns Joined path string.
 * */
export const getPathString = (
  parts: any[] = [],
  delimiter: string = PATH_DELIMITER,
  filterEmptyInput: boolean = false,
  useJson: boolean = true,
  uriEncodeParts: boolean = false,
): string =>
  parts
    .filter(filterEmptyInput ? (p) => p ?? false : () => true)
    .map(useJson ? (p) => JSON.stringify(p) : (x) => x)
    .map(uriEncodeParts ? encodeURIComponent : (x) => x)
    .join(delimiter);

/**
 * Merge two path strings.
 *
 * @param path1 - First path string.
 * @param path2 - Second path string.
 * @param delimiter - Delimiter used to split and join paths.
 * @param filterEmptyOutput - Whether to remove empty output segments.
 * @param filterEmptyInput - Whether to remove empty input segments.
 * @param useJson - Whether to parse/serialize segments as JSON.
 * @param uriEncodeParts - Whether to URI-encode each segment.
 * @returns Merged path string.
 * */
export const mergeStringPaths = (
  path1: string,
  path2: string,
  delimiter: string = PATH_DELIMITER,
  filterEmptyOutput: boolean = false,
  filterEmptyInput: boolean = true,
  useJson: boolean = true,
  uriEncodeParts: boolean = false,
): string =>
  getPathString(
    [
      ...getPathArray(
        path1,
        delimiter,
        filterEmptyOutput,
        filterEmptyInput,
        useJson,
        uriEncodeParts,
      ),
      ...getPathArray(
        path2,
        delimiter,
        filterEmptyOutput,
        filterEmptyInput,
        useJson,
        uriEncodeParts,
      ),
    ],
    delimiter,
    filterEmptyInput,
    useJson,
    uriEncodeParts,
  );

/**
 * Resolve a path string against another path string.
 *
 * @param currentPath - Base path to resolve against.
 * @param newPath - New path to resolve, absolute or relative.
 * @returns Resolved path string.
 * */
export const resolvePath = (currentPath: string, newPath: string): string => {
  const newSegments = getPathArray(newPath, PATH_DELIMITER, true);

  let currentSegments = getPathArray(currentPath, PATH_DELIMITER, true);

  // If the new path is absolute, start from the root
  if (newPath.startsWith("/")) {
    currentSegments = [];
  }

  // Iterate over the new path segments and modify the current path accordingly
  newSegments.forEach((segment) => {
    if (segment === "..") {
      // Go up one level (if possible)
      if (currentSegments.length > 0) {
        currentSegments.pop();
      }
    } else if (segment !== ".") {
      // Add the new segment
      currentSegments.push(segment);
    }
    // '.' represents the current directory, so we do nothing
  });

  // Join the segments back into a path
  return "/" + currentSegments.join("/");
};

/**
 * Get the parameter values from a path string and test the `path` against a `testPath`.
 *
 * @param path - Actual path to test.
 * @param testPath - Route pattern to match against.
 * @param exact - Whether to require an exact match.
 * @returns Params object when matched, otherwise false.
 * */
export const getParamsAndTestPath = (
  path: string,
  testPath: string,
  exact: boolean = false,
): Record<string, any> | false => {
  const pathList = getPathArray(path);
  const testPathList = getPathArray(testPath);

  if (exact && pathList.length !== testPathList.length) {
    return false;
  } else {
    let params = {} as Record<string, any>;

    if (pathList.length >= testPathList.length) {
      for (let i = 0; i < testPathList.length; i++) {
        const testPathPart = testPathList[i];
        const pathPart = pathList[i];

        if (testPathPart.startsWith(":")) {
          const paramName = testPathPart.slice(1);

          params[paramName] = pathPart;
        } else if (pathPart !== testPathPart) {
          return false;
        }
      }
    } else {
      return false;
    }

    return params;
  }
};
