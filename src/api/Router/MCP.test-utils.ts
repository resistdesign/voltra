import { getRoutePathCandidates } from "./MCP";
import { getPathArray } from "../../common/Routing";
import type { NormalizedCloudFunctionEventData } from "./Types";

const getReadableRoutePathCandidates = (
  eventData: NormalizedCloudFunctionEventData,
): string[] =>
  getRoutePathCandidates(eventData).map((path) =>
    getPathArray(path).join("/"),
  );

const getEventData = (
  body: unknown,
  headers: Record<string, string[]> = {},
): NormalizedCloudFunctionEventData => ({
  authInfo: {},
  headers,
  method: "POST",
  path: "mcp",
  body,
});

export const runNormalRoutePathScenario = () =>
  getReadableRoutePathCandidates({
    ...getEventData({ ok: true }),
    path: "status",
  });

export const runModernMCPDescriptorRoutePathScenario = () =>
  getReadableRoutePathCandidates(
    getEventData(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
      },
      {
        "mcp-method": ["server/discover"],
      },
    ),
  );

export const runModernMCPToolRoutePathScenario = () =>
  getReadableRoutePathCandidates(
    getEventData(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "healthStatus",
          arguments: {},
        },
      },
      {
        "mcp-method": ["tools/call"],
        "mcp-name": ["healthStatus"],
      },
    ),
  );

export const runBodyOnlyMCPShapeIsNotRoutedScenario = () =>
  getReadableRoutePathCandidates(
    getEventData({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "healthStatus",
        arguments: {},
      },
    }),
  );
