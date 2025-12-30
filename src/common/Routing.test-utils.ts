import {
  getPathArray,
  getPathString,
  getParamsAndTestPath,
  mergeStringPaths,
  resolvePath,
} from "./Routing";

export const runRoutingScenario = () => {
  const pathArray = getPathArray("/books/42/%7B%22a%22%3A1%7D");
  const pathArrayRaw = getPathArray("/books/42", "/", false, true, false);
  const pathArrayKeepEmpty = getPathArray("/books/42//", "/", true, false);
  const pathString = getPathString(["books", 42, { a: 1 }]);
  const pathStringEncoded = getPathString(
    ["books", 42, { a: 1 }],
    "/",
    false,
    true,
    true,
  );
  const mergedPath = mergeStringPaths("/books/42", "/chapters/3");
  const resolvedRelative = resolvePath("/books/42", "../authors/7");
  const resolvedAbsolute = resolvePath("/books/42", "/authors/7");
  const params = getParamsAndTestPath("/books/42/chapters/3", "/books/:id");
  const exactParams = getParamsAndTestPath(
    "/books/42",
    "/books/:id",
    true,
  );
  const exactMismatch = getParamsAndTestPath(
    "/books/42/chapters/3",
    "/books/:id",
    true,
  );
  const mismatch = getParamsAndTestPath("/books/42", "/authors/:id");

  return {
    pathArray,
    pathArrayRaw,
    pathArrayKeepEmpty,
    pathString,
    pathStringEncoded,
    mergedPath,
    resolvedRelative,
    resolvedAbsolute,
    params,
    exactParams,
    exactMismatch,
    mismatch,
  };
};
