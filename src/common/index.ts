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

export type * from "./HelperTypes";

export * from "./CommandLine";

export {
  TypeOperation,
} from "./TypeParsing/TypeInfo";
export type {
  DeniedOperations,
  SupportedFieldTags,
  SupportedTags,
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
} from "./TypeParsing/TypeInfo";

export {
  TypeInfoORMServiceError,
} from "./TypeInfoORM/Types";

export * from "./TypeParsing/Validation";
