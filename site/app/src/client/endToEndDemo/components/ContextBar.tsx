import type { FC } from "react";
import styled from "styled-components";

type ContextBarProps = {
  personLabel?: string | null;
  isRelating: boolean;
  showPerson: boolean;
  onGoToPeople: () => void;
  onExitRelate: () => void;
};

export const ContextBar: FC<ContextBarProps> = ({
  personLabel,
  isRelating,
  showPerson,
  onGoToPeople,
  onExitRelate,
}) => (
  <Bar>
    <button type="button" onClick={onGoToPeople}>
      People
    </button>
    {showPerson && (
      <span>
        {isRelating ? "Relating Car → " : "Person: "}
        <strong>{personLabel || "Person"}</strong>
      </span>
    )}
    {isRelating && (
      <button type="button" onClick={onExitRelate}>
        Back to Person
      </button>
    )}
  </Bar>
);

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.04);
`;
