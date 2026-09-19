import {
  addMCPToRouteMap,
  type MCPJSONSchema,
} from "./MCPRouteMap";
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

const WHO_AM_I_INPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {
    message: {
      type: "string",
    },
  },
  required: ["message"],
  additionalProperties: false,
};

const getRouteMap = (): RouteMap =>
  addMCPToRouteMap(
    {},
    {
      path: "mcp",
      name: "Voltra MCP Test",
      version: "1.0.0",
      authConfig: {
        allowedRoles: ["MCP"],
      },
      tools: [
        {
          name: "whoAmI",
          description: "Return the authenticated caller and supplied message.",
          inputSchema: WHO_AM_I_INPUT_SCHEMA,
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
  const body = getRequestBody("server/discover");
  const response = await runMCPRequest(
    body,
    "server/discover",
    undefined,
    false,
  );

  return {
    statusCode: response.statusCode,
    body: response.body,
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
  const response = await runMCPRequest(body, "tools/list");
  const parsed = JSON.parse(response.body);
  const tool = parsed.result.tools[0];

  return {
    statusCode: response.statusCode,
    name: tool.name,
    description: tool.description,
    inputType: tool.inputSchema.type,
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
  };
};
