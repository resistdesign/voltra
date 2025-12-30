import { UnionTypeNode } from "typescript";
import { extractLiteralValues } from "./extractLiteralValues";
import { LiteralValue, TypeKeyword } from "../TypeInfo";

/**
 * Determine literal options and base type keyword for a union type.
 *
 * @param unionType - Union type node to inspect.
 * @returns Literal options and inferred type keyword.
 */
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
