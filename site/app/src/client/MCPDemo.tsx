import { FC, useState } from "react";
import styled from "styled-components";
import {
  DEMO_MCP_ROUTE_PATH,
  DOMAINS,
} from "../../../common/Constants";

const MCP_PROTOCOL_VERSION = "2026-07-28";
const MCP_ENDPOINT = `https://${DOMAINS.API}${DEMO_MCP_ROUTE_PATH}`;

const ToolList = styled.ul`
  & > li {
    margin-bottom: 1em;
  }
`;

type MCPToolInfo = {
  name: string;
  description?: string;
};

export const MCPDemo: FC = () => {
  const [tools, setTools] = useState<MCPToolInfo[]>([]);
  const [status, setStatus] = useState(
    "Load the live tool catalog to verify the deployed MCP endpoint.",
  );
  const [loading, setLoading] = useState(false);

  const loadTools = async () => {
    setLoading(true);
    setStatus("Loading live MCP tools...");

    try {
      const response = await fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
          "Mcp-Method": "tools/list",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {
            _meta: {
              "io.modelcontextprotocol/protocolVersion":
                MCP_PROTOCOL_VERSION,
              "io.modelcontextprotocol/clientInfo": {
                name: "Voltra MCP Demo",
                version: "1.0.0",
              },
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      });
      const payload = await response.json();
      const nextTools = Array.isArray(payload?.result?.tools)
        ? payload.result.tools
        : [];

      setTools(nextTools);
      setStatus(
        response.ok
          ? `Loaded ${nextTools.length} live MCP tools.`
          : `MCP request failed with HTTP ${response.status}.`,
      );
    } catch (error) {
      setTools([]);
      setStatus(
        error instanceof Error
          ? `MCP request failed: ${error.message}`
          : "MCP request failed.",
      );
    }

    setLoading(false);
  };

  return (
    <article>
      <h4>Live Voltra MCP Server</h4>
      <p>
        This endpoint is served by the same Voltra RouteMap, Lambda, API
        Gateway, and ORM used by the rest of the demo application.
      </p>

      <p>
        <strong>Endpoint:</strong> <code>{MCP_ENDPOINT}</code>
      </p>

      <button type="button" onClick={loadTools} disabled={loading}>
        {loading ? "Loading..." : "Load Live MCP Tools"}
      </button>

      <p>{status}</p>

      {tools.length > 0 ? (
        <ToolList>
          {tools.map((tool) => (
            <li key={tool.name}>
              <strong>
                <code>{tool.name}</code>
              </strong>
              {tool.description ? <> — {tool.description}</> : null}
            </li>
          ))}
        </ToolList>
      ) : null}

      <h5>What this demonstrates</h5>
      <p>
        An MCP-capable LLM can connect directly to the Voltra API and use these
        bounded, read-only tools. Voltra handles the RouteMap, HTTP transport,
        schemas, and application code; the external model handles the reasoning.
      </p>
    </article>
  );
};
