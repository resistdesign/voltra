import { PropertySignature, SyntaxKind, TypeLiteralNode } from "typescript";
import { TypeInfo, TypeInfoField } from "../TypeInfo";
import { extractCommentTags } from "./extractCommentTags";
import { getTypeInfoField } from "./getTypeInfoField";

/**
 * Build a TypeInfo definition from a type literal node.
 *
 * @param typeLiteral - Type literal node to inspect.
 * @returns TypeInfo definition with fields and tags.
 */
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
