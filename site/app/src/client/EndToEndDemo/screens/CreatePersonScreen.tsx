import { type FC, type ReactNode, useCallback } from "react";
import type { TypeInfo } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { FormBlock } from "../components/FormBlock";
import { Section } from "../layout";

type CreatePersonScreenProps = {
  personTypeInfo: TypeInfo;
  personCreateKey: number;
  isSaving?: boolean;
  onCreate: (values: any) => void;
  onBack: () => void;
};

export const CreatePersonScreen: FC<CreatePersonScreenProps> = ({
  personTypeInfo,
  personCreateKey,
  isSaving,
  onCreate,
  onBack,
}) => {
  const handleRelationAction = useCallback(() => {}, []);

  return (
    <Section>
      <InlineHeader>
        <h4>Create Person</h4>
        <button type="button" onClick={onBack}>
          Back to People
        </button>
      </InlineHeader>
      <article>
        <h5>New Person</h5>
        <FormBlock
          key={`person-create-${personCreateKey}`}
          typeInfo={personTypeInfo}
          initialValues={{}}
          operation={TypeOperation.CREATE}
          onSubmit={onCreate}
          onRelationAction={handleRelationAction}
          submitDisabled={isSaving}
        />
        {isSaving && <small>Saving...</small>}
      </article>
    </Section>
  );
};

const InlineHeader: FC<{ children: ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem",
      flexWrap: "wrap",
    }}
  >
    {children}
  </div>
);
