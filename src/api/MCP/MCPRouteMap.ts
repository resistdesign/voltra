/**
 * @packageDocumentation
 *
 * Native RouteMap helpers for exposing MCP protocol methods and tools.
 *
 * MCP still uses one external HTTP endpoint. After cloud-specific event
 * normalization, Voltra maps the MCP method/name to ordinary internal RouteMap
 * paths so normal route authorization runs before MCP handlers.
 */
import {
  createMcpHandler,
  fromJsonSchema,
  McpServer,
  type ToolAnnotations,
} from "@modelcontextprotocol/server";
import {
  MCP_STANDARD_METHODS,
  addRouteToRouteMap,
  type NormalizedCloudFunctionEventData,
  type Route,
  type RouteAuthConfig,
  type RouteHandler,
  type RouteHandlerFactory,
  type RouteMap,
} from "../Router";
import { mergeStringPaths } from "../../common/Routing";
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
 * A normal Voltra Route exposed as an MCP tool.
 *
 * The route path is also the MCP tool name. Its normal `authConfig` controls
 * tool execution exactly as it would for any other Voltra route.
 */
export type MCPToolRoute = Route & {
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
};

/**
 * Backward-compatible MCP tool type alias.
 */
export type MCPTool = MCPToolRoute;

/**
 * Configuration for adding a stateless MCP endpoint to a Voltra RouteMap.
 */
export type AddMCPToRouteMapConfig = {
  /** External base route path for the MCP endpoint. */
  path: string;
  /** MCP server name advertised to clients. */
  name: string;
  /** MCP server version advertised to clients. */
  version: string;
  /**
   * Authorization for standard MCP protocol/descriptor routes.
   *
   * Defaults to public. Tool execution authorization belongs to each tool
   * Route's own `authConfig`.
   */
  authConfig?: RouteAuthConfig;
  /** Normal Voltra Routes exposed as MCP tools. */
  tools: MCPToolRoute[];
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

const getToolResultText = (result: unknown): string => {
  if (typeof result === "string") {
    return result;
  }

  if (result === undefined) {
    return "";
  }

  return JSON.stringify(result);
};

const getToolHandler = (
  tool: MCPToolRoute,
  eventData: NormalizedCloudFunctionEventData,
): RouteHandler =>
  tool.handler ? tool.handler : tool.handlerFactory(eventData);

const getMCPServer = (
  config: AddMCPToRouteMapConfig,
  eventData: NormalizedCloudFunctionEventData,
  tools: MCPToolRoute[] = config.tools,
): McpServer => {
  const server = new McpServer({
    name: config.name,
    version: config.version,
  });

  for (const tool of tools) {
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
      tool.path,
      {
        ...(tool.title ? { title: tool.title } : {}),
        ...(tool.description ? { description: tool.description } : {}),
        inputSchema,
        ...(outputSchema ? { outputSchema } : {}),
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      },
      async (input) => {
        const handler = getToolHandler(tool, eventData);
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

const getMCPHandlerFactory = (
  config: AddMCPToRouteMapConfig,
  tools: MCPToolRoute[] = config.tools,
): RouteHandlerFactory =>
  (eventData) => async () => {
    const mcpHandler = createMcpHandler(() =>
      getMCPServer(config, eventData, tools),
    );

    return mcpHandler.fetch(getMCPRequest(eventData), {
      parsedBody: eventData.body,
    });
  };

const addMCPStandardRoutes = (
  routeMap: RouteMap,
  config: AddMCPToRouteMapConfig,
): RouteMap => {
  const authConfig = config.authConfig ?? { public: true };
  const baseHandlerFactory = getMCPHandlerFactory(config);
  let newRouteMap = addRouteToRouteMap(routeMap, {
    path: config.path,
    authConfig,
    handlerFactory: baseHandlerFactory,
  });

  for (const method of MCP_STANDARD_METHODS) {
    const handlerFactory =
      method === "tools/call"
        ? getMCPHandlerFactory(config, [])
        : getMCPHandlerFactory(config);

    newRouteMap = addRouteToRouteMap(
      newRouteMap,
      {
        path: method,
        authConfig,
        handlerFactory,
      },
      config.path,
    );
  }

  return newRouteMap;
};

const addMCPToolRoutes = (
  routeMap: RouteMap,
  config: AddMCPToRouteMapConfig,
): RouteMap => {
  let newRouteMap = {
    ...routeMap,
  };
  for (const tool of config.tools) {
    const path = mergeStringPaths("tools/call", tool.path);
    const handlerFactory = getMCPHandlerFactory(config, [tool]);

    newRouteMap = addRouteToRouteMap(
      newRouteMap,
      {
        path,
        authConfig: tool.authConfig,
        handlerFactory,
      },
      config.path,
    );
  }

  return newRouteMap;
};

/**
 * Add a native MCP RouteMap surface to an existing Voltra RouteMap.
 *
 * The external MCP base path remains a normal transport fallback route.
 * Standard MCP methods become ordinary child routes under `config.path`.
 * Named `tools/call` requests become `tools/call/<tool path>` routes.
 * Therefore normal Voltra route authorization runs before MCP protocol
 * handling, and every tool owns its own normal `authConfig`.
 *
 * Standard MCP protocol/descriptor routes are public by default. Set
 * `config.authConfig` only when those standard routes themselves should be
 * protected.
 *
 * @category MCP
 * @returns New RouteMap with MCP standard routes and tool routes appended.
 */
export const addMCPToRouteMap = (
  routeMap: RouteMap,
  config: AddMCPToRouteMapConfig,
): RouteMap =>
  addMCPToolRoutes(
    addMCPStandardRoutes(routeMap, config),
    config,
  );
