import {
  AWS,
  handleCloudFunctionEvent,
  type RouteMap,
} from "../api/Router";
import {
  addTypeInfoORMHealthMCPToRouteMap,
  type TypeInfoORMHealthMCPMonitor,
} from "./TypeInfoORMHealthMCP";
import type { TypeInfoORMHealthMonitorRunResult } from "./TypeInfoORMHealthMonitor";

const PROTOCOL_VERSION = "2026-07-28";
const CLIENT_META = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientInfo": {
    name: "VoltraHealthMCPTest",
    version: "1.0.0",
  },
  "io.modelcontextprotocol/clientCapabilities": {},
};

const buildResult = (
  repairMode: "preview" | "apply",
): TypeInfoORMHealthMonitorRunResult => ({
  runId: repairMode === "preview" ? "run-preview" : "run-repair",
  repairMode,
  examinedCount: repairMode === "preview" ? 3 : 4,
  orphanFindingCount: 1,
  confirmedOrphanCount: repairMode === "preview" ? 0 : 1,
  repairedCount: repairMode === "preview" ? 0 : 1,
  schemaDriftFindingCount: 2,
  confirmedSchemaDriftCount: repairMode === "preview" ? 0 : 2,
  schemaReconciledItemCount: repairMode === "preview" ? 0 : 5,
  missingIndexFindingCount: repairMode === "preview" ? 2 : 1,
  reindexedItemCount: repairMode === "preview" ? 0 : 1,
  slowOperationFindingCount: repairMode === "preview" ? 1 : 0,
  failedOperationFindingCount: repairMode === "preview" ? 0 : 1,
  operationRecordsProcessedCount: 1,
  suspiciousCount: 0,
  expiredRecordCount: 1,
  continuation: repairMode === "preview",
});

const getMonitor = (): TypeInfoORMHealthMCPMonitor => ({
  status: async (options = {}) => ({
    examinedRecordCount: options.itemsPerPage ?? 100,
    openFindingCount: 2,
    confirmedFindingCount: 3,
    repairedFindingCount: 4,
    pendingOperationCount: 1,
    statsRecordCount: 5,
    repairRecordCount: 6,
    failedRunCount: 0,
    cursor: options.cursor ? undefined : "health-cursor-2",
    continuation: !options.cursor,
  }),
  preview: async () => buildResult("preview"),
  repair: async () => buildResult("apply"),
});

const getRouteMap = (): RouteMap =>
  addTypeInfoORMHealthMCPToRouteMap(
    {},
    {
      monitor: getMonitor(),
      path: "health-mcp",
      name: "Voltra Health Test",
      version: "1.0.0",
      authConfig: {
        allowedRoles: ["HealthAdmin"],
      },
      enableRepairTool: true,
    },
  );

const getRequestBody = (
  method: string,
  params: Record<string, unknown> = {},
) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  params: {
    ...params,
    _meta: CLIENT_META,
  },
});

const getEvent = (
  body: unknown,
  method: string,
  name?: string,
  authorized: boolean = true,
) => ({
  httpMethod: "POST",
  path: "health-mcp",
  body: JSON.stringify(body),
  headers: {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "MCP-Protocol-Version": PROTOCOL_VERSION,
    "Mcp-Method": method,
    ...(name ? { "Mcp-Name": name } : {}),
  },
  multiValueHeaders: {},
  requestContext: authorized
    ? {
        authorizer: {
          claims: {
            sub: "user-1",
            "cognito:groups": ["HealthAdmin"],
          },
        },
      }
    : {},
});

const runRequest = async (
  body: unknown,
  method: string,
  name?: string,
  authorized: boolean = true,
) =>
  handleCloudFunctionEvent(
    getEvent(body, method, name, authorized),
    AWS.normalizeCloudFunctionEvent,
    getRouteMap(),
    [],
  );

export const runHealthMCPUnauthorizedScenario = async () => {
  const response = await runRequest(
    getRequestBody("server/discover"),
    "server/discover",
    undefined,
    false,
  );

  return {
    statusCode: response.statusCode,
    body: response.body,
  };
};

export const runHealthMCPToolsScenario = async () => {
  const response = await runRequest(
    getRequestBody("tools/list"),
    "tools/list",
  );
  const parsed = JSON.parse(response.body);
  const tools = parsed.result.tools;

  return tools.map((tool: any) => ({
    name: tool.name,
    readOnlyHint: tool.annotations?.readOnlyHint,
    destructiveHint: tool.annotations?.destructiveHint,
    idempotentHint: tool.annotations?.idempotentHint,
    outputRepairModeValues: tool.outputSchema?.properties?.repairMode?.enum,
    outputContinuationType:
      tool.outputSchema?.properties?.continuation?.type,
  }));
};

export const runHealthMCPStatusScenario = async () => {
  const response = await runRequest(
    getRequestBody("tools/call", {
      name: "healthStatus",
      arguments: {
        itemsPerPage: 25,
        cursor: "health-cursor-1",
      },
    }),
    "tools/call",
    "healthStatus",
  );
  const parsed = JSON.parse(response.body);

  return {
    statusCode: response.statusCode,
    structuredContent: parsed.result.structuredContent,
  };
};

export const runHealthMCPPreviewScenario = async () => {
  const response = await runRequest(
    getRequestBody("tools/call", {
      name: "healthPreview",
      arguments: {},
    }),
    "tools/call",
    "healthPreview",
  );
  const parsed = JSON.parse(response.body);

  return {
    statusCode: response.statusCode,
    structuredContent: parsed.result.structuredContent,
  };
};

export const runHealthMCPRepairScenario = async () => {
  const response = await runRequest(
    getRequestBody("tools/call", {
      name: "healthRepair",
      arguments: {},
    }),
    "tools/call",
    "healthRepair",
  );
  const parsed = JSON.parse(response.body);

  return {
    statusCode: response.statusCode,
    structuredContent: parsed.result.structuredContent,
  };
};
