import { mergeStringPaths } from "../../common/Routing";
import type { NormalizedCloudFunctionEventData } from "./Types";

/**
 * MCP request and notification methods understood by the current MCP server
 * dependency across its supported modern and legacy protocol revisions.
 */
export const MCP_STANDARD_METHODS = [
  "server/discover",
  "subscriptions/listen",
  "tools/list",
  "tools/call",
  "prompts/get",
  "prompts/list",
  "resources/list",
  "resources/templates/list",
  "resources/read",
  "resources/subscribe",
  "resources/unsubscribe",
  "completion/complete",
  "logging/setLevel",
  "ping",
  "initialize",
  "notifications/initialized",
  "notifications/cancelled",
  "notifications/progress",
  "notifications/message",
  "notifications/resources/updated",
  "notifications/resources/list_changed",
  "notifications/tools/list_changed",
  "notifications/prompts/list_changed",
  "notifications/roots/list_changed",
  "notifications/subscriptions/acknowledged",
  "notifications/elicitation/complete",
  "notifications/tasks/status",
  "tasks/get",
  "tasks/result",
  "tasks/list",
  "tasks/cancel",
  "sampling/createMessage",
  "elicitation/create",
  "roots/list",
] as const;

const MCP_STANDARD_METHOD_SET = new Set<string>(MCP_STANDARD_METHODS);

const getSingleMCPMessage = (
  body: unknown,
): Record<string, unknown> | undefined => {
  let message = body;

  if (Array.isArray(body)) {
    if (body.length === 1) {
      message = body[0];
    } else {
      message = undefined;
    }
  }

  if (message && typeof message === "object" && !Array.isArray(message)) {
    return message as Record<string, unknown>;
  }

  return undefined;
};

/**
 * Read the MCP method from a normalized request.
 *
 * Modern MCP requests declare the method in the standard `Mcp-Method`
 * header. Legacy/stateless requests fall back to the JSON-RPC body.
 */
export const getMCPMethodFromEventData = (
  eventData: NormalizedCloudFunctionEventData,
): string | undefined => {
  const headerMethod = eventData.headers["mcp-method"]?.[0];

  if (headerMethod && MCP_STANDARD_METHOD_SET.has(headerMethod)) {
    return headerMethod;
  }

  const message = getSingleMCPMessage(eventData.body);

  if (
    message?.jsonrpc === "2.0" &&
    typeof message.method === "string" &&
    MCP_STANDARD_METHOD_SET.has(message.method)
  ) {
    return message.method;
  }

  return undefined;
};

/**
 * Read the MCP primitive name used by a named request such as `tools/call`.
 */
export const getMCPNameFromEventData = (
  eventData: NormalizedCloudFunctionEventData,
): string | undefined => {
  const headerName = eventData.headers["mcp-name"]?.[0];

  if (headerName) {
    return headerName;
  }

  const message = getSingleMCPMessage(eventData.body);
  const params =
    message?.params && typeof message.params === "object"
      ? (message.params as Record<string, unknown>)
      : undefined;

  return typeof params?.name === "string" ? params.name : undefined;
};

/**
 * Resolve normal RouteMap path candidates for a normalized request.
 *
 * Non-MCP requests keep their normal path. MCP protocol methods become
 * ordinary child paths under the externally-visible MCP endpoint. Named tool
 * calls route to a tool-specific path first, then fall back to the generic
 * `tools/call` path so malformed/unknown calls still receive an MCP protocol
 * response.
 */
export const getRoutePathCandidates = (
  eventData: NormalizedCloudFunctionEventData,
): string[] => {
  const method = getMCPMethodFromEventData(eventData);

  if (!method) {
    return [eventData.path];
  }

  const methodPath = mergeStringPaths(eventData.path, method);

  if (method === "tools/call") {
    const name = getMCPNameFromEventData(eventData);

    if (name) {
      return [mergeStringPaths(methodPath, name), methodPath];
    }
  }

  return [methodPath];
};
