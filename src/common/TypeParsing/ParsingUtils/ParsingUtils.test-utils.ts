import {
  createSourceFile,
  ScriptTarget,
  TypeAliasDeclaration,
  TypeReferenceNode,
  UnionTypeNode,
} from "typescript";
import { convertASTToMap } from "../../../build/TypeMapping";
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
import { getTypeInfoFromTypeAlias } from "./getTypeInfoFromTypeAlias";
import { TypeInfo } from "../TypeInfo";

const getParsingUtilsScenarioData = () => {
  const source = `
    /** @label Book @persisted true @meta.nested 5 */
    export type Book = {
      /** @primaryField */
      id: string;
      /** @label Title @indexed.text @indexed.exact @indexed.range */
      readonly title?: string;
      /** @indexed.exact @indexed.range @indexed.decimal */
      rating: 1 | 2 | 3;
      tags: string[];
      author: Person;
    };

    export type Person = {
      name: string;
    };

    export type Picked = Pick<Book, "id" | "rating">;
    export type UnionType = Book | Person;
    export type UnionPicked = Pick<UnionType, "id">;
    export type UnionExcluded = Exclude<UnionType, Person>;
    export type Flag = boolean;
  `;

  const node = createSourceFile("parse.ts", source, ScriptTarget.Latest, true);
  const typeMap = convertASTToMap(node, {});
  const bookNode = typeMap.Book as TypeAliasDeclaration;
  const pickedNode = typeMap.Picked as TypeAliasDeclaration;
  const unionNode = typeMap.UnionType as TypeAliasDeclaration;
  const unionPickedNode = typeMap.UnionPicked as TypeAliasDeclaration;
  const unionExcludedNode = typeMap.UnionExcluded as TypeAliasDeclaration;
  const flagNode = typeMap.Flag as TypeAliasDeclaration;

  const typeInfo = getTypeInfo(bookNode.type as any);
  const titleProperty = (bookNode.type as any).members.find(
    (member: any) => member.name?.getText() === "title",
  );
  const ratingProperty = (bookNode.type as any).members.find(
    (member: any) => member.name?.getText() === "rating",
  );
  const titleField = getTypeInfoField(titleProperty);
  const ratingField = getTypeInfoField(ratingProperty);
  const ratingType = ratingProperty.type;

  const pickedTypeRef = pickedNode.type as TypeReferenceNode;

  const unionTypeInfo = getUnionOrIntersectionTypeInfo(
    unionNode.type as UnionTypeNode,
    typeMap,
  );
  const unionPickedTypeInfo = getTypeInfoFromTypeAlias(
    unionPickedNode,
    typeMap,
  );
  const unionExcludedTypeInfo = getTypeInfoFromTypeAlias(
    unionExcludedNode,
    typeMap,
  );

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
    bookNode,
    typeInfo,
    titleField,
    ratingField,
    ratingType,
    pickedTypeRef,
    unionTypeInfo,
    unionPickedTypeInfo,
    unionExcludedTypeInfo,
    flagNode,
    primaryFieldError,
  };
};

export const runParsingUtilsCommentTagsScenario = () => {
  const { bookNode } = getParsingUtilsScenarioData();
  return extractCommentTags(bookNode);
};

export const runParsingUtilsTypeInfoFieldKeysScenario = () => {
  const { typeInfo } = getParsingUtilsScenarioData();
  return Object.keys(typeInfo.fields || {});
};

export const runParsingUtilsTitleFieldSummaryScenario = () => {
  const { titleField } = getParsingUtilsScenarioData();
  return {
    readonly: titleField.readonly,
    optional: titleField.optional,
    label: titleField.tags?.label,
    deniedOperations: titleField.tags?.deniedOperations,
  };
};

export const runParsingUtilsTitleFieldIndexedTagsScenario = () => {
  const { titleField } = getParsingUtilsScenarioData();
  return titleField.tags?.indexed;
};

export const runParsingUtilsRatingFieldIndexedTagsScenario = () => {
  const { ratingField } = getParsingUtilsScenarioData();
  return ratingField.tags?.indexed;
};

export const runParsingUtilsRatingDetailsScenario = () => {
  const { ratingType } = getParsingUtilsScenarioData();
  return extractTypeDetails(ratingType);
};

export const runParsingUtilsRatingCheckScenario = () => {
  const { ratingType } = getParsingUtilsScenarioData();
  return checkType(ratingType);
};

export const runParsingUtilsLiteralValuesScenario = () => {
  const { ratingType } = getParsingUtilsScenarioData();
  return extractLiteralValues(ratingType as UnionTypeNode);
};

export const runParsingUtilsPickedValuesScenario = () => {
  const { pickedTypeRef } = getParsingUtilsScenarioData();
  return getUnionOrLiteralStringValues(pickedTypeRef.typeArguments?.[1]);
};

export const runParsingUtilsUnionFieldSetsScenario = () => {
  const { unionTypeInfo } = getParsingUtilsScenarioData();
  return unionTypeInfo?.unionFieldSets || [];
};

export const runParsingUtilsUnionFieldKeysScenario = () => {
  const { unionTypeInfo } = getParsingUtilsScenarioData();
  return Object.keys(unionTypeInfo?.fields || {});
};

export const runParsingUtilsUnionPickedFieldSetsScenario = () => {
  const { unionPickedTypeInfo } = getParsingUtilsScenarioData();
  return unionPickedTypeInfo?.unionFieldSets || [];
};

export const runParsingUtilsUnionExcludedFieldSetsScenario = () => {
  const { unionExcludedTypeInfo } = getParsingUtilsScenarioData();
  return unionExcludedTypeInfo?.unionFieldSets || [];
};

export const runParsingUtilsFlagKeywordScenario = () => {
  const { flagNode } = getParsingUtilsScenarioData();
  return getTypeKeyword(flagNode.type);
};

export const runParsingUtilsPrimaryFieldScenario = () =>
  getPrimaryFieldForTypeInfo({
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

export const runParsingUtilsPrimaryFieldErrorScenario = () =>
  getParsingUtilsScenarioData().primaryFieldError;
