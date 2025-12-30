import {
  createSourceFile,
  ScriptTarget,
  SyntaxKind,
  TypeAliasDeclaration,
  TypeReferenceNode,
  UnionTypeNode,
} from "typescript";
import { convertASTToMap } from "../TypeMapping";
import { extractCommentTags } from "./extractCommentTags";
import { extractLiteralValues } from "./extractLiteralValues";
import { extractTypeDetails } from "./extractTypeDetails";
import { getPrimaryFieldForTypeInfo } from "./getPrimaryFieldForTypeInfo";
import { getTypeInfo } from "./getTypeInfo";
import { getTypeInfoField } from "./getTypeInfoField";
import { getTypeKeyword } from "./getTypeKeyword";
import { getUnionOrIntersectionTypeInfo } from "./getUnionOrIntersectionTypeInfo";
import { getUnionOrLiteralStringValues } from "./getUnionOrLiteralStringValues";
import { checkType } from "./checkType";
import { TypeInfo } from "../TypeInfo";

export const runParsingUtilsScenario = () => {
  const source = `
    /** @label Book @persisted true @meta.nested 5 */
    export type Book = {
      /** @primaryField */
      id: string;
      /** @label Title */
      readonly title?: string;
      rating: 1 | 2 | 3;
      tags: string[];
      author: Person;
    };

    export type Person = {
      name: string;
    };

    export type Picked = Pick<Book, "id" | "rating">;
    export type UnionType = Book | Person;
    export type Flag = boolean;
  `;

  const node = createSourceFile("parse.ts", source, ScriptTarget.Latest, true);
  const typeMap = convertASTToMap(node, {});
  const bookNode = typeMap.Book as TypeAliasDeclaration;
  const pickedNode = typeMap.Picked as TypeAliasDeclaration;
  const unionNode = typeMap.UnionType as TypeAliasDeclaration;
  const flagNode = typeMap.Flag as TypeAliasDeclaration;

  const commentTags = extractCommentTags(bookNode);
  const typeInfo = getTypeInfo(bookNode.type as any);
  const titleProperty = (bookNode.type as any).members.find(
    (member: any) => member.name?.getText() === "title",
  );
  const ratingProperty = (bookNode.type as any).members.find(
    (member: any) => member.name?.getText() === "rating",
  );
  const titleField = getTypeInfoField(titleProperty);
  const ratingType = ratingProperty.type;
  const ratingDetails = extractTypeDetails(ratingType);
  const ratingCheck = checkType(ratingType);
  const literalValues = extractLiteralValues(
    ratingType as UnionTypeNode,
  );

  const pickedTypeRef = pickedNode.type as TypeReferenceNode;
  const pickedValues = getUnionOrLiteralStringValues(
    pickedTypeRef.typeArguments?.[1],
  );

  const unionTypeInfo = getUnionOrIntersectionTypeInfo(
    unionNode.type as UnionTypeNode,
    typeMap,
  );

  const flagKeyword = getTypeKeyword(flagNode.type);

  const primaryField = getPrimaryFieldForTypeInfo({
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { primaryField: true },
      },
    },
  });

  let primaryFieldError = "";
  try {
    getPrimaryFieldForTypeInfo({
      fields: {
        id: {
          type: "string",
          array: false,
          readonly: false,
          optional: false,
          tags: {
            primaryField: true,
            deniedOperations: { READ: true },
          },
        },
      },
    } as TypeInfo);
  } catch (error) {
    primaryFieldError = error instanceof Error ? error.message : String(error);
  }

  return {
    commentTags,
    typeInfoFieldKeys: Object.keys(typeInfo.fields || {}),
    titleFieldSummary: {
      readonly: titleField.readonly,
      optional: titleField.optional,
      label: titleField.tags?.label,
      deniedOperations: titleField.tags?.deniedOperations,
    },
    ratingDetails,
    ratingCheck,
    literalValues,
    pickedValues,
    unionFieldSets: unionTypeInfo?.unionFieldSets || [],
    unionFieldKeys: Object.keys(unionTypeInfo?.fields || {}),
    flagKeyword,
    primaryField,
    primaryFieldError,
  };
};
