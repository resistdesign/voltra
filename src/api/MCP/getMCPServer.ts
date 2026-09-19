import {
  fromJsonSchema,
  McpServer,
} from "@modelcontextprotocol/server";
import type { NormalizedCloudFunctionEventData } from "../Router";
import type {
  MCPJSONSchema,
  MCPTool,
} from "./MCPTool";

const DEFAULT_MCP_TOOL_INPUT_SCHEMA: MCPJSONSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
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

/**
 * Configuration used to construct an MCP server for one Voltra request.
 */
export type MCPServerConfig = {
  /** MCP server name advertised to clients. */
  name: string;
  /** MCP server version advertised to clients. */
  version: string;
  /** Tools exposed by the MCP endpoint. */
  tools: MCPTool<any, any>[];
};

/**
 * Build an MCP server instance with tool handlers bound to the current
 * normalized Voltra request context.
 */
export const getMCPServer = (
  config: MCPServerConfig,
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
