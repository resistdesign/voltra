import type { FC } from "react";
import type { RelationActionPayload } from "../../../../../../src/app/forms";
import { AutoFormView, useFormEngine } from "../../../../../../src/app/forms";
import type { TypeInfo } from "../../../../../../src/common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../../../../../src/common/TypeParsing/TypeInfo";

type FormBlockProps = {
  typeInfo: TypeInfo;
  initialValues: Record<string, any>;
  operation: TypeOperation;
  onSubmit: (values: any) => void;
  onRelationAction?: (payload: RelationActionPayload) => void;
};

export const FormBlock: FC<FormBlockProps> = ({
  typeInfo,
  initialValues,
  operation,
  onSubmit,
  onRelationAction,
}) => {
  const controller = useFormEngine(initialValues, typeInfo, { operation });

  return (
    <AutoFormView
      controller={controller}
      onSubmit={onSubmit}
      onRelationAction={onRelationAction}
    />
  );
};
