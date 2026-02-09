/**
 * @packageDocumentation
 *
 * Server-side API utilities: routing, ORM, indexing, and data access control.
 *
 * Import from the API subpath only:
 * ```ts
 * import {
 *   AWS,
 *   addRoutesToRouteMap,
 *   handleCloudFunctionEvent,
 *   type CloudFunctionResponse,
 * } from "@resistdesign/voltra/api";
 * ```
 *
 * @example
 * ```ts
 * import {
 *   AWS,
 *   addRoutesToRouteMap,
 *   handleCloudFunctionEvent,
 *   type CloudFunctionResponse,
 * } from "@resistdesign/voltra/api";
 *
 * const routes = addRoutesToRouteMap({}, [
 *   {
 *     path: "",
 *     authConfig: { anyAuthorized: true },
 *     handler: async () => "WELCOME!!!!",
 *   },
 * ]);
 *
 * export const handler = async (
 *   event: any,
 * ): Promise<CloudFunctionResponse> =>
 *   handleCloudFunctionEvent(
 *     event,
 *     AWS.normalizeCloudFunctionEvent,
 *     routes,
 *     [
 *       process.env.CLIENT_ORIGIN as string,
 *       /https:\\/\\/example\\.com(:.*?$|\\/.*$|$)/gim,
 *     ],
 *   );
 * ```
 *
 * See also: `@resistdesign/voltra/app` for client-side app helpers.
 */
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { RouteMap } from "@resistdesign/voltra/api"`.
 */
export * as Indexing from "./Indexing";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { getTypeInfoORMRouteMap } from "@resistdesign/voltra/api"`.
 */
export * as ORM from "./ORM";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { RouteMap } from "@resistdesign/voltra/api"`.
 */
export * as Routing from "./Router";
/**
 * @deprecated Prefer domain-flat imports such as
 * `import { DACConstraintType } from "@resistdesign/voltra/api"`.
 */
export * as DAC from "./DataAccessControl";

export * from "./Indexing";
export * from "./ORM";
export * from "./Router";
export * from "./DataAccessControl";
