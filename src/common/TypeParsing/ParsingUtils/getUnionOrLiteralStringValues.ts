import { LiteralTypeNode, Node, SyntaxKind, UnionTypeNode } from 'typescript';

export const getUnionOrLiteralStringValues = (node?: Node): string[] => {
  let values: string[] = [];

  if (node) {
    if (node.kind === SyntaxKind.LiteralType) {
      const { literal } = node as LiteralTypeNode;

      if (literal.kind === SyntaxKind.StringLiteral || literal.kind === SyntaxKind.NumericLiteral) {
        const { text } = literal;

        values = [text];
      }
    } else if (node.kind === SyntaxKind.UnionType) {
      const { types } = node as UnionTypeNode;

      for (const type of types) {
        values = [...values, ...getUnionOrLiteralStringValues(type)];
      }
    }
  }

  return values;
};
