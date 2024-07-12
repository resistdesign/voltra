import {
  JSDoc,
  JSDocComment,
  JSDocTag,
  Node,
  NodeArray,
  TypeAliasDeclaration,
} from "typescript";
import { getPathArray, getPotentialJSONValue } from "../../Routing";

type TagInfo = {
  name: string;
  value: any;
};

const TAG_NAME_PATH_DELIMITER = ".";

const getFlatTagValue = (tagValue: JSDocTag["comment"]): string => {
  if (typeof tagValue === "undefined") {
    return "true";
  }
  if (Array.isArray(tagValue)) {
    const valueNodeArray = tagValue as NodeArray<JSDocComment>;
    const valueList = [];

    for (let i = 0; i < valueNodeArray.length; i++) {
      const { text }: JSDocComment = valueNodeArray[i];

      valueList.push(getFlatTagValue(text));
    }

    return valueList.join(" ");
  } else {
    return `${tagValue}`;
  }
};

const getTagNameAndValue = (tag: JSDocTag): TagInfo => {
  let name = tag.tagName.text,
    value = getFlatTagValue(tag.comment);

  if (value.startsWith(TAG_NAME_PATH_DELIMITER)) {
    const extendedTagNameEndIndex = value.indexOf(" ");

    name += value.slice(0, extendedTagNameEndIndex);
    value = value.slice(extendedTagNameEndIndex);
  }

  return {
    name,
    value,
  };
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
          const { name: tagName, value: tagValue } = getTagNameAndValue(tag);

          commentTags = getObjectWithValueAppliedToPath(
            getPathArray(tagName, TAG_NAME_PATH_DELIMITER),
            getPotentialJSONValue(tagValue),
            commentTags,
          );
        });
      }
    });
  }

  return commentTags;
};
