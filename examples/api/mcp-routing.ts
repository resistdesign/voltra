import {
  addMCPToRouteMap,
  type RouteMap,
} from "@resistdesign/voltra/api";

/**
 * Add a stateless MCP endpoint to an existing Voltra RouteMap.
 *
 * Descriptor/protocol requests are public by default so MCP clients can
 * discover the server before authenticating. Functional tool calls still use
 * normal Voltra route authorization. Set `protectDescriptorRoutes: true` to
 * protect the whole MCP endpoint instead. Tool factories receive the normalized
 * request context, including the authenticated caller.
 */
export const MCP_ROUTE_MAP: RouteMap = addMCPToRouteMap(
  {},
  {
    path: "mcp",
    name: "Example App",
    version: "1.0.0",
    authConfig: {
      allowedRoles: ["MCP"],
    },
    protectDescriptorRoutes: false,
    tools: [
      {
        name: "whoAmI",
        description: "Return the authenticated MCP caller.",
        annotations: {
          readOnlyHint: true,
        },
        handlerFactory: (eventData) => async () => ({
          userId: eventData.authInfo.userId,
          roles: eventData.authInfo.roles,
        }),
      },
    ],
  },
);
