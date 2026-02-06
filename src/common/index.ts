/**
 * @packageDocumentation
 *
 * Common module exports for shared utilities, types, and helpers used across
 * app, API, and IaC layers.
 *
 * Import from the common subpath only:
 * ```ts
 * import * as Common from "@resistdesign/voltra/common";
 *
 * const path = Common.Routing.getPathString(["users", 42], "/", true, false);
 * const id = Common.IDGeneration.getSimpleId();
 * ```
 *
 * See also: `@resistdesign/voltra/app`, `@resistdesign/voltra/api`, and
 * `@resistdesign/voltra/iac`.
 */

export * as CommandLine from "./CommandLine";
export * as TypeParsing from "./TypeParsing";
export * as Routing from "./Routing";
export * as IDGeneration from "./IdGeneration";
export * as SearchTypes from "./SearchTypes";
export * as SearchUtils from "./SearchUtils";
export * as StringTransformers from "./StringTransformers";
export * as ItemRelationshipInfoTypes from "./ItemRelationshipInfoTypes";
export * as ItemRelationships from "./ItemRelationships";
export * as Testing from "./Testing";
export type * as HelperTypes from "./HelperTypes";
export * as Logging from "./Logging";
