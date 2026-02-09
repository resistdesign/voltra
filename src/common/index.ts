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
 * @deprecated Prefer domain-flat imports such as
 * `import { collectRequiredEnvironmentVariables } from "@resistdesign/voltra/common"`.
 */
export * as CommandLine from "./CommandLine";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { TypeInfo } from "@resistdesign/voltra/common"`.
 */
export * as TypeParsing from "./TypeParsing";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { getPathString } from "@resistdesign/voltra/common"`.
 */
export * as Routing from "./Routing";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { getSimpleId } from "@resistdesign/voltra/common"`.
 */
export * as IDGeneration from "./IdGeneration";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { ListItemsConfig } from "@resistdesign/voltra/common"`.
 */
export * as SearchTypes from "./SearchTypes";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { getSearchTypeInfoFieldName } from "@resistdesign/voltra/common"`.
 */
export * as SearchUtils from "./SearchUtils";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { toCamelCase } from "@resistdesign/voltra/common"`.
 */
export * as StringTransformers from "./StringTransformers";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { ItemRelationshipInfo } from "@resistdesign/voltra/common"`.
 */
export * as ItemRelationshipInfoTypes from "./ItemRelationshipInfoTypes";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { getItemRelationshipIsValid } from "@resistdesign/voltra/common"`.
 */
export * as ItemRelationships from "./ItemRelationships";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { runSpecs } from "@resistdesign/voltra/common"`.
 */
export * as Testing from "./Testing";
export type * as HelperTypes from "./HelperTypes";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { logFunctionCall } from "@resistdesign/voltra/common"`.
 */
export * as Logging from "./Logging";

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
