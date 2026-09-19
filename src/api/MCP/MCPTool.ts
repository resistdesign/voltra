import type { ToolAnnotations } from "@modelcontextprotocol/server";
import type { NormalizedCloudFunctionEventData } from "../Router";

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
