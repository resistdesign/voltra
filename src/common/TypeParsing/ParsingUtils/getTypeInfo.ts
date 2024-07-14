import { PropertySignature, SyntaxKind, TypeLiteralNode } from "typescript";
import { TypeInfo, TypeInfoField } from "../TypeInfo";
import { extractCommentTags } from "./extractCommentTags";
import { getTypeInfoField } from "./getTypeInfoField";

export const getTypeInfo = (typeLiteral: TypeLiteralNode): TypeInfo => {
  const { members } = typeLiteral;
  const tags = extractCommentTags(typeLiteral);

  let fields: Record<string, TypeInfoField> = {};

  for (const m of members) {
    const { name, kind } = m;

    if (name && kind === SyntaxKind.PropertySignature) {
      const fieldName = name.getText();
      const field = getTypeInfoField(m as PropertySignature);

      fields = {
        ...fields,
        [fieldName]: field,
      };
    }
  }

  return {
    fields,
    tags,
  };
};
