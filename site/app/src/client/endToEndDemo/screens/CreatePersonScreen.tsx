import type { FC, ReactNode } from "react";
import type { TypeInfo } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { FormBlock } from "../components/FormBlock";
import { Section } from "../layout";

type CreatePersonScreenProps = {
  personTypeInfo: TypeInfo;
  personCreateKey: number;
  onCreate: (values: any) => void;
  onBack: () => void;
};

export const CreatePersonScreen: FC<CreatePersonScreenProps> = ({
  personTypeInfo,
  personCreateKey,
  onCreate,
  onBack,
}) => (
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
        onRelationAction={() => {}}
      />
    </article>
  </Section>
);

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
