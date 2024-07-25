/**
 * The delimiter used to separate paths.
 * */
export const PATH_DELIMITER = "/";

export const getPotentialJSONValue = (value: string): any => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

/**
 * Get the path segments from a path string.
 * */
export const getPathArray = (
  path: string,
  delimiter: string = PATH_DELIMITER,
  filterEmpty: boolean = false,
): any[] =>
  path
    .split(delimiter)
    .map(decodeURIComponent)
    .map((p) => getPotentialJSONValue(p))
    .filter((p) => !filterEmpty || p !== "");

/**
 * Get the path string from path segments.
 * */
export const getPathString = (
  parts: any[] = [],
  delimiter: string = PATH_DELIMITER,
  filterEmpty: boolean = false,
): string =>
  parts
    .filter((p) => !filterEmpty || p !== "")
    .map((p) => JSON.stringify(p))
    .map(encodeURIComponent)
    .join(delimiter);

/**
 * Merge two path strings.
 * */
export const mergeStringPaths = (path1: string, path2: string): string =>
  getPathString([...getPathArray(path1), ...getPathArray(path2)]);

/**
 * Resolve a path string against another path string.
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
 * Get the parameter values from a path string and test the path against a test path.
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
