import { PropertySignature, SyntaxKind, TypeLiteralNode } from "typescript";
import { TypeInfo, TypeInfoField } from "../TypeInfo";
import { extractCommentTags } from "./extractCommentTags";
import { getTypeInfoField } from "./getTypeInfoField";

export const getTypeInfo = (typeLiteral: TypeLiteralNode): TypeInfo => {
  const { members } = typeLiteral;
  const tags = extractCommentTags(typeLiteral);

  let fields: Record<string, TypeInfoField> = {},
    primaryField: string | undefined = undefined;

  for (const m of members) {
    const { name, kind } = m;

    if (name && kind === SyntaxKind.PropertySignature) {
      const fieldName = name.getText();
      const field = getTypeInfoField(m as PropertySignature);
      const { tags: { primaryField: isPrimaryField = false } = {} } = field;

      if (isPrimaryField || !primaryField) {
        primaryField = fieldName;
      }

      fields = {
        ...fields,
        [fieldName]: field,
      };
    }
  }

  return {
    primaryField: primaryField,
    fields,
    tags,
  };
};
