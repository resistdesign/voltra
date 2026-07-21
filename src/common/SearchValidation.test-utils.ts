import { validateSearchFields } from "./SearchValidation";
import { ComparisonOperators, type FieldCriterion } from "./SearchTypes";
import { TypeInfoMap } from "./TypeParsing/TypeInfo";
import type {
  ArrayErrorDescriptorCollection,
  ErrorDescriptor,
  TypeInfoValidationResults,
} from "./TypeParsing/Validation";
import {
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptors,
} from "./TypeParsing/Validation";

const toLegacyValidationShape = (results: TypeInfoValidationResults) => ({
  ...results,
  error:
    results.error.code === ERROR_MESSAGE_CONSTANTS.NONE
      ? ""
      : results.error.code,
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

const createTypeInfoMap = (): TypeInfoMap => ({
  Book: {
    fields: {
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      rating: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
      },
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: false,
      },
      author: {
        type: "string",
        typeReference: "Person",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          deniedOperations: {
            READ: true,
          },
        },
      },
    },
  },
});

export const runSearchValidationInvalidTypeScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const invalidType = validateSearchFields(
    "Missing",
    typeInfoMap,
    [
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Voltra",
      },
    ],
    false,
  );

  return toLegacyValidationShape(invalidType);
};

export const runSearchValidationInvalidOperatorScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const invalidOperator = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "title",
        operator: "NOT_A_REAL_OPERATOR" as ComparisonOperators,
        value: "Voltra",
      } as FieldCriterion,
    ],
    false,
  );

  return toLegacyValidationShape(invalidOperator);
};

export const runSearchValidationInvalidFieldScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const invalidField = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "missing",
        operator: ComparisonOperators.EQUALS,
        value: "Voltra",
      },
    ],
    false,
  );

  return toLegacyValidationShape(invalidField);
};

export const runSearchValidationRelationalDeniedScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const relationalDenied = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "author",
        operator: ComparisonOperators.EQUALS,
        value: "person-1",
      },
    ],
    false,
  );

  return toLegacyValidationShape(relationalDenied);
};

export const runSearchValidationRelationalDisallowedScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const relationalDisallowed = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "author",
        operator: ComparisonOperators.EQUALS,
        value: "person-1",
      },
    ],
    true,
  );

  return toLegacyValidationShape(relationalDisallowed);
};

export const runSearchValidationInvalidValueOptionScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const invalidValueOption = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "rating",
        operator: ComparisonOperators.IN,
        valueOptions: ["nope", 5],
      },
    ],
    false,
  );

  return toLegacyValidationShape(invalidValueOption);
};

export const runSearchValidationValidSearchScenario = () => {
  const typeInfoMap = createTypeInfoMap();
  const validSearch = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "title",
        operator: ComparisonOperators.LIKE,
        value: "Voltra",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "guide",
      },
    ],
    false,
  );

  return toLegacyValidationShape(validSearch);
};
