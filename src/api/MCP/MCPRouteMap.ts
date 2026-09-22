/**
 * @packageDocumentation
 *
 * Route map helpers that expose MCP tools through the Voltra Router layer.
 * Use {@link addMCPToRouteMap} to add one authenticated, stateless MCP endpoint
 * to an existing RouteMap.
 */
import {
  createMcpHandler,
  fromJsonSchema,
  McpServer,
  type ToolAnnotations,
} from "@modelcontextprotocol/server";
import {
  addRouteToRouteMap,
  type NormalizedCloudFunctionEventData,
  type RouteAuthConfig,
  type RouteMap,
} from "../Router";
import { getRouteIsAuthorized } from "../Router/Auth";
import {
  getJSONSchemaFromTypeInfoPack,
  type TypeInfoPack,
} from "../../common/TypeParsing";

const DEFAULT_MCP_TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

/**
 * MCP tool annotations advertised to clients.
 */
export type MCPToolAnnotations = ToolAnnotations;

/**
 * Handler invoked when an MCP client calls a tool.
 */
export type MCPToolHandler<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> = (input: TInput) => TOutput | Promise<TOutput>;

/**
 * Factory used to create an MCP tool handler with request context injected.
 */
export type MCPToolHandlerFactory<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> = (
  eventData: NormalizedCloudFunctionEventData,
) => MCPToolHandler<TInput, TOutput>;

/**
 * Tool exposed through an MCP route.
 */
export type MCPTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> = {
  /** Tool name exposed to the MCP client. */
  name: string;
  /** Optional human-friendly title. */
  title?: string;
  /** Description used by the model to decide when to call the tool. */
  description?: string;
  /**
   * Voltra TypeInfo contract for tool arguments.
   *
   * Voltra converts this to JSON Schema for MCP automatically.
   */
  inputTypeInfo?: TypeInfoPack;
  /**
   * Optional Voltra TypeInfo contract for structured tool output.
   *
   * Voltra converts this to JSON Schema for MCP automatically.
   */
  outputTypeInfo?: TypeInfoPack;
  /** MCP behavior hints such as read-only or destructive operation hints. */
  annotations?: MCPToolAnnotations;
} & (
  | {
      /** Direct tool handler. */
      handler: MCPToolHandler<TInput, TOutput>;
      handlerFactory?: never;
    }
  | {
      handler?: never;
      /** Factory that receives the normalized Voltra request context. */
      handlerFactory: MCPToolHandlerFactory<TInput, TOutput>;
    }
);

/**
 * Configuration for adding a stateless MCP endpoint to a Voltra RouteMap.
 */
export type AddMCPToRouteMapConfig = {
  /** Route path for the MCP endpoint. */
  path: string;
  /** MCP server name advertised to clients. */
  name: string;
  /** MCP server version advertised to clients. */
  version: string;
  /**
   * Normal Voltra authorization applied to functional MCP tool calls.
   *
   * Descriptor/protocol requests remain public by default so clients can
   * discover the server and its tools before authenticating.
   */
  authConfig?: RouteAuthConfig;
  /**
   * Protect descriptor/protocol requests with the same `authConfig`.
   *
   * Defaults to false. Set true when server discovery, tool descriptors, and
   * other MCP protocol metadata should require authorization too.
   */
  protectDescriptorRoutes?: boolean;
  /** Tools exposed by the MCP endpoint. */
  tools: MCPTool<any, any>[];
};

const getRequestHeaders = (
  eventData: NormalizedCloudFunctionEventData,
): Headers => {
  const headers = new Headers();

  for (const key in eventData.headers) {
    const values = eventData.headers[key];

    for (const value of values) {
      headers.append(key, value);
    }
  }

  return headers;
};

const getMCPRequest = (
  eventData: NormalizedCloudFunctionEventData,
): Request => {
  const method = eventData.method.toUpperCase();
  const canHaveBody = method !== "GET" && method !== "HEAD";
  const path = eventData.path.startsWith("/")
    ? eventData.path
    : `/${eventData.path}`;
  const body =
    canHaveBody && eventData.body !== undefined
      ? JSON.stringify(eventData.body)
      : undefined;

  return new Request(`https://voltra.local${path}`, {
    method,
    headers: getRequestHeaders(eventData),
    body,
  });
};

const getMCPRequestMethods = (
  eventData: NormalizedCloudFunctionEventData,
): string[] => {
  const { body } = eventData;
  const messages = Array.isArray(body) ? body : [body];
  const methods: string[] = [];

  for (const message of messages) {
    if (message && typeof message === "object" && !Array.isArray(message)) {
      const method = (message as { method?: unknown }).method;

      if (typeof method === "string") {
        methods.push(method);
      }
    }
  }

  if (methods.length === 0) {
    const headerMethod = eventData.headers["mcp-method"]?.[0];

    if (headerMethod) {
      methods.push(headerMethod);
    }
  }

  return methods;
};

const getMCPRequestRequiresFunctionalAuth = (
  eventData: NormalizedCloudFunctionEventData,
): boolean => getMCPRequestMethods(eventData).includes("tools/call");

const getMCPRouteAuthConfig = (
  config: AddMCPToRouteMapConfig,
): RouteAuthConfig =>
  config.protectDescriptorRoutes ? (config.authConfig ?? {}) : { public: true };

const getToolResultText = (result: unknown): string => {
  if (typeof result === "string") {
    return result;
  }

  if (result === undefined) {
    return "";
  }

  return JSON.stringify(result);
};

const getMCPServer = (
  config: AddMCPToRouteMapConfig,
  eventData: NormalizedCloudFunctionEventData,
): McpServer => {
  const server = new McpServer({
    name: config.name,
    version: config.version,
  });

  for (const tool of config.tools) {
    const handler = tool.handler
      ? tool.handler
      : tool.handlerFactory(eventData);
    const inputJSONSchema = tool.inputTypeInfo
      ? getJSONSchemaFromTypeInfoPack(tool.inputTypeInfo)
      : DEFAULT_MCP_TOOL_INPUT_SCHEMA;
    const outputJSONSchema = tool.outputTypeInfo
      ? getJSONSchemaFromTypeInfoPack(tool.outputTypeInfo)
      : undefined;
    const inputSchema = fromJsonSchema(inputJSONSchema);
    const outputSchema = outputJSONSchema
      ? fromJsonSchema(outputJSONSchema)
      : undefined;

    server.registerTool(
      tool.name,
      {
        ...(tool.title ? { title: tool.title } : {}),
        ...(tool.description ? { description: tool.description } : {}),
        inputSchema,
        ...(outputSchema ? { outputSchema } : {}),
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      },
      async (input) => {
        const result = await handler(input);

        return {
          content: [
            {
              type: "text",
              text: getToolResultText(result),
            },
          ],
          ...(tool.outputTypeInfo ? { structuredContent: result } : {}),
        };
      },
    );
  }

  return server;
};

/**
 * Add a stateless MCP tool endpoint to an existing Voltra RouteMap.
 *
 * By default, MCP descriptor/protocol requests are public while functional
 * tool calls use `authConfig`. Set `protectDescriptorRoutes` to true to
 * apply the same authorization to the whole MCP endpoint. Tool handlerFactory
 * callbacks receive the same normalized caller context as ordinary route
 * handler factories, including authenticated user id and roles.
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
    authConfig: getMCPRouteAuthConfig(config),
    handlerFactory: (eventData) => async () => {
      const functionalRequestIsAuthorized =
        !getMCPRequestRequiresFunctionalAuth(eventData) ||
        getRouteIsAuthorized(eventData.authInfo, config.authConfig ?? {});

      if (!functionalRequestIsAuthorized) {
        return new Response("Unauthorized", {
          status: 401,
        });
      }

      const mcpHandler = createMcpHandler(() =>
        getMCPServer(config, eventData),
      );

      return mcpHandler.fetch(getMCPRequest(eventData), {
        parsedBody: eventData.body,
      });
    },
  });
