import { FC, useState } from "react";
import {
  DEMO_HEALTH_MCP_ROUTE_PATH,
  DOMAINS,
} from "../../../common/Constants";

const MCP_PROTOCOL_VERSION = "2026-07-28";
const HEALTH_MCP_ENDPOINT =
  `https://${DOMAINS.API}${DEMO_HEALTH_MCP_ROUTE_PATH}`;

type HealthPreviewResult = {
  runId: string;
  repairMode: "preview" | "apply";
  examinedCount: number;
  orphanFindingCount: number;
  confirmedOrphanCount: number;
  repairedCount: number;
  schemaDriftFindingCount: number;
  confirmedSchemaDriftCount: number;
  schemaReconciledItemCount: number;
  missingIndexFindingCount: number;
  reindexedItemCount: number;
  slowOperationFindingCount: number;
  failedOperationFindingCount: number;
  operationRecordsProcessedCount: number;
  suspiciousCount: number;
  expiredRecordCount: number;
  continuation: boolean;
};

export const HealthDemo: FC = () => {
  const [result, setResult] = useState<HealthPreviewResult>();
  const [status, setStatus] = useState(
    "Run a bounded non-destructive Health pass against the live demo ORM and indexes.",
  );
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setStatus("Running live Health preview...");

    try {
      const response = await fetch(HEALTH_MCP_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
          "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
          "Mcp-Method": "tools/call",
          "Mcp-Name": "healthPreview",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "healthPreview",
            arguments: {},
            _meta: {
              "io.modelcontextprotocol/protocolVersion":
                MCP_PROTOCOL_VERSION,
              "io.modelcontextprotocol/clientInfo": {
                name: "Voltra Health Demo",
                version: "1.0.0",
              },
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      });
      const payload = await response.json();
      const nextResult = payload?.result?.structuredContent as
        | HealthPreviewResult
        | undefined;
      const rpcErrorMessage =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : payload?.result?.isError && Array.isArray(payload.result.content)
            ? payload.result.content.find(
                (entry: any) =>
                  entry?.type === "text" && typeof entry.text === "string",
              )?.text
            : undefined;

      setResult(nextResult);
      setStatus(
        response.ok && nextResult
          ? "Health preview completed."
          : rpcErrorMessage
            ? `Health preview failed: ${rpcErrorMessage}`
            : `Health preview failed with HTTP ${response.status}.`,
      );
    } catch (error) {
      setResult(undefined);
      setStatus(
        error instanceof Error
          ? `Health preview failed: ${error.message}`
          : "Health preview failed.",
      );
    }

    setLoading(false);
  };

  return (
    <article>
      <h4>Live Voltra Health Monitor</h4>
      <p>
        The demo provisions one Health table and runs the same bounded,
        resumable monitor that an application can schedule in Lambda, Fargate,
        cron, or another TypeScript runtime.
      </p>

      <p>
        <strong>Non-destructive MCP endpoint:</strong>{" "}
        <code>{HEALTH_MCP_ENDPOINT}</code>
      </p>

      <button type="button" onClick={runPreview} disabled={loading}>
        {loading ? "Running..." : "Run Live Health Preview"}
      </button>

      <p>{status}</p>

      {result ? (
        <table>
          <tbody>
            <tr>
              <td>Index records examined</td>
              <td>{result.examinedCount}</td>
            </tr>
            <tr>
              <td>Orphan findings</td>
              <td>{result.orphanFindingCount}</td>
            </tr>
            <tr>
              <td>Confirmed orphans</td>
              <td>{result.confirmedOrphanCount}</td>
            </tr>
            <tr>
              <td>Schema drift findings</td>
              <td>{result.schemaDriftFindingCount}</td>
            </tr>
            <tr>
              <td>Missing/mismatched index findings</td>
              <td>{result.missingIndexFindingCount}</td>
            </tr>
            <tr>
              <td>Items reindexed</td>
              <td>{result.reindexedItemCount}</td>
            </tr>
            <tr>
              <td>Slow operations found</td>
              <td>{result.slowOperationFindingCount}</td>
            </tr>
            <tr>
              <td>Failed operations found</td>
              <td>{result.failedOperationFindingCount}</td>
            </tr>
            <tr>
              <td>Operation records processed</td>
              <td>{result.operationRecordsProcessedCount}</td>
            </tr>
            <tr>
              <td>Suspicious findings</td>
              <td>{result.suspiciousCount}</td>
            </tr>
            <tr>
              <td>Expired Health records cleaned</td>
              <td>{result.expiredRecordCount}</td>
            </tr>
            <tr>
              <td>More bounded work remains</td>
              <td>{result.continuation ? "Yes" : "No"}</td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <h5>Production repair</h5>
      <p>
        The public demo does not expose repair. Applications can explicitly
        enable the <code>healthRepair</code> MCP tool and protect the endpoint
        with normal Voltra role/group authorization.
      </p>
    </article>
  );
};
