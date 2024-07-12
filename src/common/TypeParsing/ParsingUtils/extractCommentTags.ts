import {
  JSDoc,
  JSDocComment,
  Node,
  NodeArray,
  TypeAliasDeclaration,
} from "typescript";
import { getPotentialJSONValue } from "../../Routing";

const getTagValueFromJSON = (
  value: string | NodeArray<JSDocComment> | undefined,
): any => {
  if (typeof value === "undefined") {
    return true;
  } else if (Array.isArray(value)) {
    const valueNodeArray = value as NodeArray<JSDocComment>;
    const valueList = [];

    for (let i = 0; i < valueNodeArray.length; i++) {
      const { text }: JSDocComment = valueNodeArray[i];

      valueList.push(getTagValueFromJSON(text));
    }

    return valueList;
  } else {
    return getPotentialJSONValue(value as string);
  }
};

export const extractCommentTags = (node: Node): Record<any, any> => {
  const commentTags: Record<string, any> = {};

  const jsDocComments = (node as TypeAliasDeclaration)[
    "jsDoc" as keyof TypeAliasDeclaration
  ];

  if (jsDocComments) {
    jsDocComments.forEach((jsDoc: JSDoc) => {
      const tags = jsDoc.tags;
      if (tags) {
        tags.forEach((tag) => {
          commentTags[tag.tagName.text] = getTagValueFromJSON(tag.comment);
        });
      }
    });
  }

  return commentTags;
};
