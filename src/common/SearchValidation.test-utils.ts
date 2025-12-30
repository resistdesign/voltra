import { validateSearchFields } from "./SearchValidation";
import { ComparisonOperators } from "./SearchTypes";
import { TypeInfoMap } from "./TypeParsing/TypeInfo";

export const runSearchValidationScenario = () => {
  const typeInfoMap: TypeInfoMap = {
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
  };

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

  const invalidOperator = validateSearchFields(
    "Book",
    typeInfoMap,
    [
      {
        fieldName: "title",
        operator: "NOT_A_REAL_OPERATOR" as ComparisonOperators,
        value: "Voltra",
      },
    ],
    false,
  );

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

  return {
    invalidType,
    invalidOperator,
    invalidField,
    relationalDenied,
    relationalDisallowed,
    invalidValueOption,
    validSearch,
  };
};
