import {
  TYPE_INFO_ORM_RELATIONSHIP_ERRORS,
  validateRelationshipItem,
} from "./ItemRelationshipValidation";
import { ItemRelationshipInfoKeys } from "../ItemRelationshipInfoTypes";
import type {
  ErrorDescriptor,
  TypeInfoValidationResults,
} from "../TypeParsing/Validation";
import { ERROR_MESSAGE_CONSTANTS } from "../TypeParsing/Validation";

const toLegacyValidationShape = (results: TypeInfoValidationResults) => ({
  ...results,
  error:
    results.error.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : results.error.code,
  errorMap: Object.entries(results.errorMap).reduce(
    (acc, [key, descriptors]: [string, ErrorDescriptor[]]) => {
      acc[key] = descriptors.map((descriptor) =>
        descriptor.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : descriptor.code,
      );
      return acc;
    },
    {} as Record<string, string[]>,
  ),
});

export const runItemRelationshipValidationScenario = () => {
  const baseItem = {
    [ItemRelationshipInfoKeys.fromTypeName]: "Book",
    [ItemRelationshipInfoKeys.fromTypeFieldName]: "author",
    [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: "book-1",
    [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "person-1",
  };

  const validResult = validateRelationshipItem(baseItem, []);
  const missingFieldResult = validateRelationshipItem(
    {
      ...baseItem,
      [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "",
    },
    [],
  );
  const { toTypePrimaryFieldValue: _omitted, ...originItem } = baseItem;
  const omittedFieldResult = validateRelationshipItem(originItem, [
    ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
  ]);
  const omittedFieldErrorResult = validateRelationshipItem(
    {
      ...baseItem,
      [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "",
    },
    [ItemRelationshipInfoKeys.toTypePrimaryFieldValue],
  );

  return {
    validResult: toLegacyValidationShape(validResult),
    missingFieldResult: toLegacyValidationShape(missingFieldResult),
    omittedFieldResult: toLegacyValidationShape(omittedFieldResult),
    omittedFieldErrorResult: toLegacyValidationShape(omittedFieldErrorResult),
    expectedErrors: TYPE_INFO_ORM_RELATIONSHIP_ERRORS,
  };
};
