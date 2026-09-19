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

const DEFAULT_MCP_TOOL_INPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

/**
 * JSON Schema used to describe MCP tool inputs and outputs.
 */
export type MCPJSONSchema = Record<string, unknown>;

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
  /** JSON Schema for the tool argument object. */
  inputSchema?: MCPJSONSchema;
  /** Optional JSON Schema for structured tool output. */
  outputSchema?: MCPJSONSchema;
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
  /** Normal Voltra route authorization applied to the whole MCP endpoint. */
  authConfig?: RouteAuthConfig;
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

const getRequestURL = (
  eventData: NormalizedCloudFunctionEventData,
): string => {
  const path = eventData.path.startsWith("/")
    ? eventData.path
    : `/${eventData.path}`;

  return `https://voltra.local${path}`;
};

const getMCPRequest = (
  eventData: NormalizedCloudFunctionEventData,
): Request => {
  const method = eventData.method.toUpperCase();
  const canHaveBody = method !== "GET" && method !== "HEAD";
  const body =
    canHaveBody && eventData.body !== undefined
      ? JSON.stringify(eventData.body)
      : undefined;

  return new Request(getRequestURL(eventData), {
    method,
    headers: getRequestHeaders(eventData),
    body,
  });
};

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
    const inputSchema = fromJsonSchema(
      tool.inputSchema ?? DEFAULT_MCP_TOOL_INPUT_SCHEMA,
    );
    const outputSchema = tool.outputSchema
      ? fromJsonSchema(tool.outputSchema)
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
          ...(tool.outputSchema ? { structuredContent: result } : {}),
        };
      },
    );
  }

  return server;
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
