/**
 * @packageDocumentation
 *
 * Common module exports for shared utilities, types, and helpers used across
 * app, API, and IaC layers.
 *
 * Import from the common subpath only:
 * ```ts
 * import {
 *   getPathString,
 *   getSimpleId,
 * } from "@resistdesign/voltra/common";
 *
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
 * @group Type Parsing
 */
export {
  TypeOperation,
} from "./TypeParsing/TypeInfo";
/**
 * @category common
 * @group Type Parsing
 */
export type {
  DeniedOperations,
  SupportedFieldTags,
  SupportedTags,
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
} from "./TypeParsing/TypeInfo";

/**
 * @category common
 * @group Shared Types
 */
export {
  TypeInfoORMServiceError,
} from "./TypeInfoORM/Types";

/**
 * @category common
 * @group Type Parsing
 */
export * from "./TypeParsing/Validation";
