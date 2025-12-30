import {
  isLiteralTypeNode,
  isNumericLiteral,
  isStringLiteral,
  SyntaxKind,
  UnionTypeNode,
} from "typescript";
import { LiteralValue, TypeKeyword } from "../TypeInfo";

/**
 * Extract literal values and inferred keyword from a union of literals.
 *
 * @param node - Union type node containing literal members.
 * @returns Literal values and detected type keyword, or undefined if mixed.
 */
export const extractLiteralValues = (
  node: UnionTypeNode,
): { values: LiteralValue[]; type: TypeKeyword } | undefined => {
  const literalValues: LiteralValue[] = [];
  let detectedTypeKeyword: TypeKeyword | undefined;

  for (const type of node.types) {
    if (isLiteralTypeNode(type)) {
      const literal = type.literal;
      if (isStringLiteral(literal)) {
        if (!detectedTypeKeyword) detectedTypeKeyword = "string";
        if (detectedTypeKeyword === "string") {
          literalValues.push(literal.text);
        }
      } else if (isNumericLiteral(literal)) {
        if (!detectedTypeKeyword) detectedTypeKeyword = "number";
        if (detectedTypeKeyword === "number") {
          literalValues.push(Number(literal.text));
        }
      } else if (
        literal.kind === SyntaxKind.TrueKeyword ||
        literal.kind === SyntaxKind.FalseKeyword
      ) {
        if (!detectedTypeKeyword) detectedTypeKeyword = "boolean";
        if (detectedTypeKeyword === "boolean") {
          literalValues.push(literal.kind === SyntaxKind.TrueKeyword);
        }
      } else if (literal.kind === SyntaxKind.NullKeyword) {
        literalValues.push(null);
      }
    } else {
      return undefined;
    }
  }

  return literalValues.length
    ? { values: literalValues, type: detectedTypeKeyword! }
    : undefined;
};
