import { TypeAliasDeclaration } from "typescript";
import { TypeMap } from "../TypeMapping";
import { TypeInfo } from "../TypeInfo";
import { extractCommentTags } from "./extractCommentTags";
import { getTypeInfoFromAliasType } from "./getTypeInfoFromAliasType";

/**
 * Resolve TypeInfo for a type alias declaration.
 *
 * @param typeAliasDec - Type alias declaration node.
 * @param typeMap - Map of available type aliases.
 * @returns Resolved TypeInfo or undefined when unsupported.
 */
export const getTypeInfoFromTypeAlias = (
  typeAliasDec: TypeAliasDeclaration,
  typeMap: TypeMap,
): TypeInfo | undefined => {
  const { type } = typeAliasDec;
  const tags = extractCommentTags(typeAliasDec);
  const typeInfo = getTypeInfoFromAliasType(type, typeMap);

  return typeInfo
    ? {
        ...typeInfo,
        tags: {
          ...tags,
          ...typeInfo.tags,
        },
      }
    : undefined;
};
