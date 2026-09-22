import {
  addMCPToRouteMap,
  type RouteMap,
} from "@resistdesign/voltra/api";

/**
 * Add a stateless MCP endpoint to an existing Voltra RouteMap.
 *
 * Standard MCP descriptor/protocol routes are public by default. Each tool is
 * a normal Voltra Route and owns its own authConfig. Tool factories receive the
 * normalized request context, including the authenticated caller.
 */
export const MCP_ROUTE_MAP: RouteMap = addMCPToRouteMap(
  {},
  {
    path: "mcp",
    name: "Example App",
    version: "1.0.0",
    tools: [
      {
        path: "whoAmI",
        authConfig: {
          allowedRoles: ["MCP"],
        },
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
