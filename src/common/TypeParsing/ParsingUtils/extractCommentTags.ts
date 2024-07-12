import { JSDoc, Node, TypeAliasDeclaration } from "typescript";

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
          commentTags[tag.tagName.text] = tag.comment || true;
        });
      }
    });
  }

  return commentTags;
};
