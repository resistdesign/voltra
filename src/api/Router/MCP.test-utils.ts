import { getRoutePathCandidates } from "./MCP";
import type { NormalizedCloudFunctionEventData } from "./Types";

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
  getRoutePathCandidates({
    ...getEventData({ ok: true }),
    path: "status",
  });

export const runModernMCPDescriptorRoutePathScenario = () =>
  getRoutePathCandidates(
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
  getRoutePathCandidates(
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

export const runLegacyMCPToolRoutePathScenario = () =>
  getRoutePathCandidates(
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
