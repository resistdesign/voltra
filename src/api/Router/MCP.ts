import { mergeStringPaths } from "../../common/Routing";
import type { NormalizedCloudFunctionEventData } from "./Types";

/**
 * MCP request methods supported by Voltra's V3 MCP integration.
 *
 * Voltra V3 intentionally targets the modern 2026 MCP era only.
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
  "notifications/elicitation/complete",
  "tasks/get",
  "tasks/result",
  "tasks/list",
  "tasks/cancel",
] as const;

const MCP_STANDARD_METHOD_SET = new Set<string>(MCP_STANDARD_METHODS);

/**
 * Read the MCP method from a normalized request.
 *
 * Modern MCP requests declare the method in the standard `Mcp-Method`
 * header. Voltra V3 does not infer MCP routing from legacy request bodies.
 */
export const getMCPMethodFromEventData = (
  eventData: NormalizedCloudFunctionEventData,
): string | undefined => {
  const headerMethod = eventData.headers["mcp-method"]?.[0];

  return headerMethod && MCP_STANDARD_METHOD_SET.has(headerMethod)
    ? headerMethod
    : undefined;
};

/**
 * Read the MCP primitive name used by a named request such as `tools/call`.
 */
export const getMCPNameFromEventData = (
  eventData: NormalizedCloudFunctionEventData,
): string | undefined => {
  const headerName = eventData.headers["mcp-name"]?.[0];

  return headerName || undefined;
};

/**
 * Resolve normal RouteMap path candidates for a normalized request.
 *
 * Non-MCP requests keep their normal path. MCP protocol methods become
 * ordinary child paths under the externally-visible MCP endpoint. Named tool
 * calls route to a tool-specific path first, then fall back to the generic
 * `tools/call` path and finally the original HTTP path. Protocol identifiers
 * are preserved exactly as path segments; Voltra does not rename tool names.
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
      return [
        mergeStringPaths(methodPath, name),
        methodPath,
        eventData.path,
      ];
    }
  }

  return [methodPath, eventData.path];
};
