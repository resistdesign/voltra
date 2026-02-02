import type { FC } from "react";
import type { TypeInfoORMAPI, TypeInfoORMAPIRoutePaths } from "../../../../../../src/common/TypeInfoORM";
import { InlineRow, LogGrid, Section, Stack } from "../layout";

export type RequestLogEntry = {
  id: string;
  methodName: keyof TypeInfoORMAPI;
  path: TypeInfoORMAPIRoutePaths;
  args: any[];
  status: "pending" | "success" | "error";
  response?: any;
  error?: any;
  timestamp: string;
};

type DebugLogPanelProps = {
  requestLog: RequestLogEntry[];
  onClear: () => void;
};

export const DebugLogPanel: FC<DebugLogPanelProps> = ({
  requestLog,
  onClear,
}) => (
  <Section>
    <h4>Request / Response Log</h4>
    <article>
      <InlineRow>
        <p>
          Inspect the exact payloads sent to the ORM routes and the responses
          returned.
        </p>
        <button type="button" onClick={onClear}>
          Clear Log
        </button>
      </InlineRow>
      {requestLog.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <Stack>
          {requestLog.map((entry) => (
            <details key={entry.id}>
              <summary>
                {entry.methodName} ({entry.path}) - {entry.status}
              </summary>
              <LogGrid>
                <div>
                  <strong>Request</strong>
                  <pre>
                    {JSON.stringify(
                      {
                        args: entry.args,
                        timestamp: entry.timestamp,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
                <div>
                  <strong>Response</strong>
                  <pre>{JSON.stringify(entry.response, null, 2)}</pre>
                </div>
                <div>
                  <strong>Error</strong>
                  <pre>{JSON.stringify(entry.error, null, 2)}</pre>
                </div>
              </LogGrid>
            </details>
          ))}
        </Stack>
      )}
    </article>
  </Section>
);
