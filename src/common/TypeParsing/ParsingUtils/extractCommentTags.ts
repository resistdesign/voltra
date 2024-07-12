import {
  JSDoc,
  JSDocComment,
  Node,
  NodeArray,
  TypeAliasDeclaration,
} from "typescript";
import { getPathArray, getPotentialJSONValue } from "../../Routing";

const TAG_NAME_PATH_DELIMITER = "_";

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

const getObjectWithValueAppliedToPath = (
  path: any[] = [],
  value: any,
  baseObject?: object | any[],
): any => {
  let baseParentObject: any = undefined,
    currentParent: any = undefined;

  if (path.length === 0) {
    baseParentObject = value;
  } else {
    for (let i = 0; i < path.length; i++) {
      const pathPart = path[i];
      const cleanPathPart =
        typeof pathPart === "number"
          ? pathPart
          : `${typeof pathPart !== "undefined" ? pathPart : ""}`;
      const isNum = typeof cleanPathPart === "number";

      let newCurrentParent: any = undefined;

      if (i === 0) {
        if (!baseObject) {
          baseParentObject = isNum ? [] : {};
        } else {
          baseParentObject = isNum
            ? [...(Array.isArray(baseObject) ? baseObject : [])]
            : {
                ...(typeof baseObject === "object" ? baseObject : {}),
              };
        }

        currentParent = baseParentObject;
      }

      if (i < path.length - 1) {
        const existingNewCurrentParent = currentParent[cleanPathPart];

        newCurrentParent = isNum
          ? [
              ...(Array.isArray(existingNewCurrentParent)
                ? existingNewCurrentParent
                : []),
            ]
          : {
              ...(typeof existingNewCurrentParent === "object"
                ? existingNewCurrentParent
                : {}),
            };

        currentParent[cleanPathPart] = newCurrentParent;
        currentParent = newCurrentParent;
      } else {
        currentParent[cleanPathPart] = value;
      }
    }
  }

  return baseParentObject;
};

export const extractCommentTags = (node: Node): Record<any, any> => {
  const jsDocComments = (node as TypeAliasDeclaration)[
    "jsDoc" as keyof TypeAliasDeclaration
  ];

  let commentTags: Record<string, any> = {};

  if (jsDocComments) {
    jsDocComments.forEach((jsDoc: JSDoc) => {
      const tags = jsDoc.tags;
      if (tags) {
        tags.forEach((tag) => {
          commentTags = getObjectWithValueAppliedToPath(
            getPathArray(tag.tagName.text, TAG_NAME_PATH_DELIMITER),
            getTagValueFromJSON(tag.comment),
            commentTags,
          );
        });
      }
    });
  }

  return commentTags;
};
