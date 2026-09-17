import { UnionTypeNode } from "typescript";
import { extractLiteralValues } from "./extractLiteralValues";
import { LiteralValue, TypeKeyword } from "../TypeInfo";

/**
 * Determine literal options and base type keyword for a union type.
 *
 * @param unionType - Union type node to inspect.
 * @returns Literal options, inferred type keyword, and exhaustiveness metadata.
 */
export const checkUnionType = (
  unionType: UnionTypeNode,
): {
  options?: LiteralValue[];
  typeKeyword?: TypeKeyword;
  possibleValuesExhaustive?: boolean;
} => {
  const extracted = extractLiteralValues(unionType);

  return extracted
    ? {
        options: extracted.values,
        typeKeyword: extracted.type,
        possibleValuesExhaustive: extracted.possibleValuesExhaustive,
      }
    : {};
};
