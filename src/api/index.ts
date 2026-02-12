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
 *
 * Reference examples:
 * - `examples/README.md`
 * - `examples/api/backend-routing.ts`
 */
/**
 * @category api
 * @group Indexing
 */
export * from "./Indexing";
/**
 * @category api
 * @group ORM
 */
export * from "./ORM";
/**
 * @category api
 * @group Routing
 */
export * from "./Router";
/**
 * @category api
 * @group Data Access Control
 */
export * from "./DataAccessControl";
