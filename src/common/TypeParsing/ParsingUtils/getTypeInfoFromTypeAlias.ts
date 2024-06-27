import { TypeAliasDeclaration } from "typescript";
import { TypeMap } from "../TypeMapping";
import { TypeInfo } from "../TypeInfo";
import { extractCommentTags } from "./extractCommentTags";
import { getTypeInfoFromAliasType } from "./getTypeInfoFromAliasType";

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
