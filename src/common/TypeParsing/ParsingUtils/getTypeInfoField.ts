import { PropertySignature, SyntaxKind } from "typescript";
import { SupportedFieldTags, TypeInfoField, TypeKeyword } from "../TypeInfo";
import { extractTypeDetails } from "./extractTypeDetails";
import { extractCommentTags } from "./extractCommentTags";

export const getTypeInfoField = (
  propertySignature: PropertySignature,
): TypeInfoField => {
  const { type, modifiers } = propertySignature;
  const {
    array,
    typeReference,
    type: typeKeyword,
    options,
  } = type
    ? extractTypeDetails(type)
    : {
        array: false,
        typeReference: undefined,
        type: "string" as TypeKeyword,
        options: undefined,
      };
  const readonly = modifiers
    ? modifiers.some((modifier) => modifier.kind === SyntaxKind.ReadonlyKeyword)
    : false;
  const optional = !!propertySignature.questionToken;

  let tags = extractCommentTags(propertySignature);

  if (readonly) {
    const {
      deniedOperations,
      deniedOperations: { create, update, delete: del } = {},
    }: SupportedFieldTags = tags || {};

    tags = {
      ...tags,
      deniedOperations: {
        ...deniedOperations,
        create: create ?? true,
        update: update ?? true,
        delete: del ?? true,
      },
    };
  }

  return {
    type: typeKeyword,
    array,
    readonly,
    optional,
    typeReference,
    possibleValues: options,
    tags,
  };
};
