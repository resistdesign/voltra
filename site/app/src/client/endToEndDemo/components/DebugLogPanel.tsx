import { useState, type FC } from "react";
import styled from "styled-components";
import { InlineRow, LogGrid, Section, Stack } from "../layout";
import type { RequestLogEntry } from "../logging/demoLogger";

type DebugLogPanelProps = {
  requestLog: RequestLogEntry[];
  onClear: () => void;
};

export const DebugLogPanel: FC<DebugLogPanelProps> = ({
  requestLog,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ToggleButton type="button" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? "Hide Log" : "Show Log"}
      </ToggleButton>
      {isOpen && (
        <Section>
          <h4>Request / Response Log</h4>
          <article>
            <InlineRow>
              <p>
                Inspect the exact payloads sent to the ORM routes and the
                responses returned.
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
      )}
    </>
  );
};

const ToggleButton = styled.button`
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 10;
`;
