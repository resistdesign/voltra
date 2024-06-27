import { UnionTypeNode } from "typescript";
import { extractLiteralValues } from "./extractLiteralValues";
import { LiteralValue, TypeKeyword } from "../TypeInfo";

export const checkUnionType = (
  unionType: UnionTypeNode,
): {
  options: LiteralValue[] | undefined;
  typeKeyword: TypeKeyword;
} => {
  const extracted = extractLiteralValues(unionType);

  let typeKeyword: TypeKeyword = "string";
  let options: LiteralValue[] | undefined;

  if (extracted) {
    options = extracted.values;
    typeKeyword = extracted.type;
  }

  return { options: options || [], typeKeyword };
};
