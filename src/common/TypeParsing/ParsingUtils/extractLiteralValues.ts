import {
  isLiteralTypeNode,
  isNumericLiteral,
  isStringLiteral,
  SyntaxKind,
  UnionTypeNode,
} from "typescript";
import { LiteralValue, TypeKeyword } from "../TypeInfo";

/**
 * Extract literal values and inferred keyword from a homogeneous union.
 *
 * A matching broad primitive member is allowed alongside literals of the same
 * primitive kind. Unsupported or incompatible members fail closed so union
 * members are never silently discarded.
 *
 * @param node - Union type node containing compatible literal/primitive members.
 * @returns Literal values, detected type keyword, and whether they are exhaustive.
 */
export const extractLiteralValues = (
  node: UnionTypeNode,
):
  | {
      values: LiteralValue[];
      type: TypeKeyword;
      possibleValuesExhaustive: boolean;
    }
  | undefined => {
  const literalValues: LiteralValue[] = [];
  let detectedTypeKeyword: TypeKeyword | undefined;
  let broadPrimitivePresent = false;

  for (const type of node.types) {
    let memberTypeKeyword: TypeKeyword | undefined;
    let literalValue: LiteralValue | undefined;
    let literalValuePresent = false;

    if (isLiteralTypeNode(type)) {
      const literal = type.literal;

      if (isStringLiteral(literal)) {
        memberTypeKeyword = "string";
        literalValue = literal.text;
        literalValuePresent = true;
      } else if (isNumericLiteral(literal)) {
        memberTypeKeyword = "number";
        literalValue = Number(literal.text);
        literalValuePresent = true;
      } else if (
        literal.kind === SyntaxKind.TrueKeyword ||
        literal.kind === SyntaxKind.FalseKeyword
      ) {
        memberTypeKeyword = "boolean";
        literalValue = literal.kind === SyntaxKind.TrueKeyword;
        literalValuePresent = true;
      } else {
        return undefined;
      }
    } else if (type.kind === SyntaxKind.StringKeyword) {
      memberTypeKeyword = "string";
      broadPrimitivePresent = true;
    } else if (type.kind === SyntaxKind.NumberKeyword) {
      memberTypeKeyword = "number";
      broadPrimitivePresent = true;
    } else if (type.kind === SyntaxKind.BooleanKeyword) {
      memberTypeKeyword = "boolean";
      broadPrimitivePresent = true;
    } else {
      return undefined;
    }

    if (
      detectedTypeKeyword &&
      memberTypeKeyword !== detectedTypeKeyword
    ) {
      return undefined;
    }

    detectedTypeKeyword = memberTypeKeyword;

    if (literalValuePresent) {
      literalValues.push(literalValue as LiteralValue);
    }
  }

  return detectedTypeKeyword && literalValues.length
    ? {
        values: literalValues,
        type: detectedTypeKeyword,
        possibleValuesExhaustive: !broadPrimitivePresent,
      }
    : undefined;
};
