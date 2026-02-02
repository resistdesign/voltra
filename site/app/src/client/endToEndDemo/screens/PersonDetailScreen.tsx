import type { FC } from "react";
import type { RelationActionPayload } from "../../../../../../src/app/forms";
import type { TypeInfo } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { FormBlock } from "../components/FormBlock";
import { Grid, InlineRow, Section } from "../layout";

type PersonDetailScreenProps = {
  personTypeInfo: TypeInfo;
  personId: string;
  person: any | null;
  onUpdate: (values: any) => void;
  onDelete: () => void;
  onStartRelate: () => void;
  onBack: () => void;
  onRelationAction: (payload: RelationActionPayload) => void;
};

export const PersonDetailScreen: FC<PersonDetailScreenProps> = ({
  personTypeInfo,
  personId,
  person,
  onUpdate,
  onDelete,
  onStartRelate,
  onBack,
  onRelationAction,
}) => (
  <Section>
    <InlineRow>
      <h4>Person Details</h4>
      <button type="button" onClick={onBack}>
        Back to People
      </button>
      <button type="button" onClick={onStartRelate}>
        Manage Car Relationship
      </button>
    </InlineRow>
    <Grid>
      <article>
        <h5>Selected Person</h5>
        <FormBlock
          key={`person-edit-${personId}`}
          typeInfo={personTypeInfo}
          initialValues={person ?? {}}
          operation={TypeOperation.UPDATE}
          onSubmit={onUpdate}
          onRelationAction={onRelationAction}
        />
        <button type="button" onClick={onDelete}>
          Delete Person
        </button>
      </article>
      <article>
        <h5>Person Record (Read)</h5>
        <pre>{JSON.stringify(person, null, 2)}</pre>
      </article>
    </Grid>
  </Section>
);
