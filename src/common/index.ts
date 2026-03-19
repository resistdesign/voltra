/**
 * @packageDocumentation
 *
 * Common module exports for shared utilities, types, and helpers used across
 * app, API, and IaC layers.
 *
 * Import from the common subpath only:
 * ```ts
 * import {
 *   getPathArray,
 *   getPathString,
 *   getSimpleId,
 * } from "@resistdesign/voltra/common";
 *
 * const segments = getPathArray("/users/42", "/", true, true, false, false);
 * const path = getPathString(["users", 42], "/", true, false);
 * const id = getSimpleId();
 * ```
 *
 * See also: `@resistdesign/voltra/app`, `@resistdesign/voltra/api`, and
 * `@resistdesign/voltra/iac`.
 */
/**
 * @category common
 * @group Shared Types
 */
export type * from "./HelperTypes";

/**
 * @category common
 * @group Command Line
 */
export * from "./CommandLine";

/**
 * @category common
 * @group Routing
 */
export * from "./Routing";

/**
 * @category common
 * @group Type Parsing
 */
export * from "./TypeParsing";

/**
 * @category common
 * @group Shared Types
 */
export * from "./TypeInfoORM";
