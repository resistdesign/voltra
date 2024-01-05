export const getPathArray = (path: string): string[] =>
  path
    .split('/')
    .map((p) => decodeURIComponent(p))
    .filter((part) => part !== '');
export const getPathString = (path: string[]): string => '/' + path.join('/');
export const mergeStringPaths = (path1: string, path2: string): string =>
  getPathString([...getPathArray(path1), ...getPathArray(path2)]);

export const resolvePath = (currentPath: string, newPath: string): string => {
  let currentSegments = getPathArray(currentPath);
  const newSegments = getPathArray(newPath);

  // If the new path is absolute, start from the root
  if (newPath.startsWith('/')) {
    currentSegments = [];
  }

  // Iterate over the new path segments and modify the current path accordingly
  newSegments.forEach((segment) => {
    if (segment === '..') {
      // Go up one level (if possible)
      if (currentSegments.length > 0) {
        currentSegments.pop();
      }
    } else if (segment !== '.') {
      // Add the new segment
      currentSegments.push(segment);
    }
    // '.' represents the current directory, so we do nothing
  });

  // Join the segments back into a path
  return '/' + currentSegments.join('/');
};

export const getParamsAndTestPath = (
  path: string,
  testPath: string,
  exact: boolean = false
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

        if (testPathPart.startsWith(':')) {
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
