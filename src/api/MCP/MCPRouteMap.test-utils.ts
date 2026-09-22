import { addMCPToRouteMap } from "./MCPRouteMap";
import type { TypeInfoMap } from "../../common/TypeParsing";
import { mergeStringPaths } from "../../common/Routing";
import {
  AWS,
  handleCloudFunctionEvent,
  type RouteMap,
} from "../Router";

const PROTOCOL_VERSION = "2026-07-28";
const CLIENT_META = {
  "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
  "io.modelcontextprotocol/clientInfo": {
    name: "VoltraMCPTest",
    version: "1.0.0",
  },
  "io.modelcontextprotocol/clientCapabilities": {},
};

const MCP_TEST_TYPE_INFO_MAP: TypeInfoMap = {
  WhoAmIInput: {
    fields: {
      message: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
  WhoAmIOutput: {
    fields: {
      userId: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      roles: {
        type: "string",
        array: true,
        readonly: false,
        optional: false,
      },
      message: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
};

const getRouteMap = (
  standardAuthConfig?: {
    public?: boolean;
    allowedRoles?: string[];
  },
): RouteMap =>
  addMCPToRouteMap(
    {},
    {
      path: "mcp",
      name: "Voltra MCP Test",
      version: "1.0.0",
      ...(standardAuthConfig ? { authConfig: standardAuthConfig } : {}),
      tools: [
        {
          path: "whoAmI",
          authConfig: {
            allowedRoles: ["MCP"],
          },
          description: "Return the authenticated caller and supplied message.",
          inputTypeInfo: {
            entryTypeName: "WhoAmIInput",
            typeInfoMap: MCP_TEST_TYPE_INFO_MAP,
          },
          outputTypeInfo: {
            entryTypeName: "WhoAmIOutput",
            typeInfoMap: MCP_TEST_TYPE_INFO_MAP,
          },
          annotations: {
            readOnlyHint: true,
          },
          handlerFactory: (eventData) => async (input: any) => ({
            userId: eventData.authInfo.userId,
            roles: eventData.authInfo.roles,
            message: input.message,
          }),
        },
      ],
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
  path: "mcp",
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
            "cognito:groups": ["MCP", "Admin"],
          },
        },
      }
    : {},
});

const runMCPRequest = async (
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

export const runMCPUnauthorizedScenario = async () => {
  const body = getRequestBody("tools/call", {
    name: "whoAmI",
    arguments: {
      message: "hello",
    },
  });
  const response = await runMCPRequest(
    body,
    "tools/call",
    "whoAmI",
    false,
  );

  return {
    statusCode: response.statusCode,
    body: response.body,
  };
};

export const runMCPPublicDescriptorScenario = async () => {
  const body = getRequestBody("server/discover");
  const response = await runMCPRequest(
    body,
    "server/discover",
    undefined,
    false,
  );
  const parsed = JSON.parse(response.body);

  return {
    statusCode: response.statusCode,
    serverName:
      parsed.result._meta?.["io.modelcontextprotocol/serverInfo"]?.name,
  };
};

export const runMCPNativeRouteKeysScenario = () => {
  const routeMap = getRouteMap();
  const routes = [
    {
      label: "mcp",
      path: mergeStringPaths("", "mcp"),
    },
    {
      label: "mcp/server/discover",
      path: mergeStringPaths("mcp", "server/discover"),
    },
    {
      label: "mcp/tools/list",
      path: mergeStringPaths("mcp", "tools/list"),
    },
    {
      label: "mcp/tools/call",
      path: mergeStringPaths("mcp", "tools/call"),
    },
    {
      label: "mcp/tools/call/whoAmI",
      path: mergeStringPaths("mcp", "tools/call/whoAmI"),
    },
  ];

  return routes.map(({ label, path }) => ({
    path: label,
    exists: Object.prototype.hasOwnProperty.call(routeMap, path),
    authConfig: routeMap[path]?.authConfig,
  }));
};

export const runMCPStandardRouteAuthOverrideScenario = () => {
  const routeMap = getRouteMap({
    allowedRoles: ["DescriptorAdmin"],
  });
  const descriptorPath = mergeStringPaths("mcp", "server/discover");
  const toolPath = mergeStringPaths("mcp", "tools/call/whoAmI");

  return {
    descriptorAuthConfig: routeMap[descriptorPath]?.authConfig,
    toolAuthConfig: routeMap[toolPath]?.authConfig,
  };
};

export const runMCPDiscoverScenario = async () => {
  const body = getRequestBody("server/discover");
  const response = await runMCPRequest(body, "server/discover");
  const parsed = JSON.parse(response.body);

  return {
    statusCode: response.statusCode,
    contentType: response.headers["content-type"],
    supportedVersions: parsed.result.supportedVersions,
    serverName:
      parsed.result._meta?.["io.modelcontextprotocol/serverInfo"]?.name,
  };
};

export const runMCPToolsListScenario = async () => {
  const body = getRequestBody("tools/list");
  const response = await runMCPRequest(
    body,
    "tools/list",
    undefined,
    false,
  );
  const parsed = JSON.parse(response.body);
  const tool = parsed.result.tools[0];

  return {
    statusCode: response.statusCode,
    name: tool.name,
    description: tool.description,
    inputType: tool.inputSchema.type,
    inputMessageType: tool.inputSchema.properties?.message?.type,
    inputRequired: tool.inputSchema.required,
    outputRolesType: tool.outputSchema.properties?.roles?.type,
    outputRolesItemType: tool.outputSchema.properties?.roles?.items?.type,
    readOnlyHint: tool.annotations?.readOnlyHint,
  };
};

export const runMCPToolHandlerFactoryScenario = async () => {
  const body = getRequestBody("tools/call", {
    name: "whoAmI",
    arguments: {
      message: "hello",
    },
  });
  const response = await runMCPRequest(body, "tools/call", "whoAmI");
  const parsed = JSON.parse(response.body);
  const toolResult = JSON.parse(parsed.result.content[0].text);

  return {
    statusCode: response.statusCode,
    toolResult,
    structuredContent: parsed.result.structuredContent,
  };
};
