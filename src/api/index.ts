/**
 * @packageDocumentation
 *
 * Server-side API utilities: routing, ORM, indexing, and data access control.
 *
 * Import from the API subpath only:
 * ```ts
 * import * as API from "@resistdesign/voltra/api";
 * ```
 *
 * @example
 * ```ts
 * import * as API from "@resistdesign/voltra/api";
 *
 * const routes = API.Routing.addRoutesToRouteMap({}, [
 *   {
 *     path: "",
 *     authConfig: { anyAuthorized: true },
 *     handler: async () => "WELCOME!!!!",
 *   },
 * ]);
 *
 * export const handler = async (
 *   event: any,
 * ): Promise<API.Routing.CloudFunctionResponse> =>
 *   API.Routing.handleCloudFunctionEvent(
 *     event,
 *     API.Routing.AWS.normalizeCloudFunctionEvent,
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
export * as Indexing from "./Indexing";
export * as ORM from "./ORM";
export * as Routing from "./Router";
export * as DAC from "./DataAccessControl";
