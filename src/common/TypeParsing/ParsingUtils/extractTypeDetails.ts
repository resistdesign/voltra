import { TypeNode } from "typescript";
import { LiteralValue, TypeKeyword } from "../TypeInfo";
import { checkType } from "./checkType";

/**
 * Extract TypeInfo field details from a type node.
 *
 * @param type - Type node to inspect.
 * @returns Type details including keyword, reference, array flag, and options.
 */
export const extractTypeDetails = (
  type: TypeNode,
): {
  type: TypeKeyword;
  typeReference?: string;
  array: boolean;
  options?: LiteralValue[];
} => {
  const { isArray, typeReference, options, typeKeyword } = checkType(type);

  return {
    type: typeKeyword || "string",
    typeReference,
    array: !!isArray,
    options,
  };
};
