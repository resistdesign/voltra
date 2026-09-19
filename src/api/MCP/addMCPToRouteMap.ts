import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  addRouteToRouteMap,
  type RouteAuthConfig,
  type RouteMap,
} from "../Router";
import { getMCPRequest } from "./getMCPRequest";
import {
  getMCPServer,
  type MCPServerConfig,
} from "./getMCPServer";

/**
 * Configuration for adding a stateless MCP endpoint to a Voltra RouteMap.
 */
export type AddMCPToRouteMapConfig = MCPServerConfig & {
  /** Route path for the MCP endpoint. */
  path: string;
  /** Normal Voltra route authorization applied to the whole MCP endpoint. */
  authConfig?: RouteAuthConfig;
};

/**
 * Add a stateless MCP tool endpoint to an existing Voltra RouteMap.
 *
 * The endpoint uses the route's normal Voltra authorization. Tool
 * handlerFactory callbacks receive the same normalized caller context as
 * ordinary route handler factories, including authenticated user id and roles.
 *
 * @category MCP
 * @returns New route map with the MCP endpoint appended.
 */
export const addMCPToRouteMap = (
  routeMap: RouteMap,
  config: AddMCPToRouteMapConfig,
): RouteMap =>
  addRouteToRouteMap(routeMap, {
    path: config.path,
    authConfig: config.authConfig,
    handlerFactory: (eventData) => async () => {
      const mcpHandler = createMcpHandler(() =>
        getMCPServer(config, eventData),
      );

      return mcpHandler.fetch(getMCPRequest(eventData), {
        parsedBody: eventData.body,
      });
    },
  });
