import {
  TYPE_INFO_ORM_RELATIONSHIP_ERRORS,
  validateRelationshipItem,
} from "./ItemRelationshipValidation";
import { ItemRelationshipInfoKeys } from "../ItemRelationshipInfoTypes";
import type {
  ArrayErrorDescriptorCollection,
  ErrorDescriptor,
  TypeInfoValidationResults,
} from "../TypeParsing/Validation";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptors,
} from "../TypeParsing/Validation";

const toLegacyValidationShape = (results: TypeInfoValidationResults) => ({
  ...results,
  error:
    results.error.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : results.error.code,
  errorMap: Object.entries(results.errorMap).reduce(
    (
      acc,
      [key, descriptors]: [
        string,
        (ErrorDescriptor | ArrayErrorDescriptorCollection)[],
      ],
    ) => {
      acc[key] = getErrorDescriptors(descriptors).map((descriptor) =>
        descriptor.code === ERROR_MESSAGE_CONSTANTS.NONE ? "" : descriptor.code,
      );
      return acc;
    },
    {} as Record<string, string[]>,
  ),
});

const getRelationshipValidationScenarioData = () => {
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
    validResult,
    missingFieldResult,
    omittedFieldResult,
    omittedFieldErrorResult,
  };
};

export const runItemRelationshipValidationValidResultScenario = () =>
  toLegacyValidationShape(getRelationshipValidationScenarioData().validResult);

export const runItemRelationshipValidationMissingFieldResultScenario = () =>
  toLegacyValidationShape(
    getRelationshipValidationScenarioData().missingFieldResult,
  );

export const runItemRelationshipValidationOmittedFieldResultScenario = () =>
  toLegacyValidationShape(
    getRelationshipValidationScenarioData().omittedFieldResult,
  );

export const runItemRelationshipValidationOmittedFieldErrorResultScenario = () =>
  toLegacyValidationShape(
    getRelationshipValidationScenarioData().omittedFieldErrorResult,
  );

export const runItemRelationshipValidationExpectedErrorsScenario = () =>
  TYPE_INFO_ORM_RELATIONSHIP_ERRORS;
