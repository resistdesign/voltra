import {
  getPathArray,
  getPathString,
  getParamsAndTestPath,
  mergeStringPaths,
  resolvePath,
} from "./Routing";

export const runRoutingPathArrayScenario = () =>
  getPathArray("/books/42/%7B%22a%22%3A1%7D");

export const runRoutingPathArrayRawScenario = () =>
  getPathArray("/books/42", "/", false, true, false);

export const runRoutingPathArrayKeepEmptyScenario = () =>
  getPathArray("/books/42//", "/", true, false);

export const runRoutingPathStringScenario = () =>
  getPathString(["books", 42, { a: 1 }]);

export const runRoutingPathStringEncodedScenario = () =>
  getPathString(
    ["books", 42, { a: 1 }],
    "/",
    false,
    true,
    true,
  );

export const runRoutingMergePathScenario = () =>
  mergeStringPaths("/books/42", "/chapters/3");

export const runRoutingResolveRelativeScenario = () =>
  resolvePath("/books/42", "../authors/7");

export const runRoutingResolveAbsoluteScenario = () =>
  resolvePath("/books/42", "/authors/7");

export const runRoutingParamsScenario = () =>
  getParamsAndTestPath("/books/42/chapters/3", "/books/:id");

export const runRoutingExactParamsScenario = () =>
  getParamsAndTestPath("/books/42", "/books/:id", true);

export const runRoutingExactMismatchScenario = () =>
  getParamsAndTestPath(
    "/books/42/chapters/3",
    "/books/:id",
    true,
  );

export const runRoutingMismatchScenario = () =>
  getParamsAndTestPath("/books/42", "/authors/:id");
