import { ComparisonOperators, FieldCriterion } from "./SearchTypes";
import { TypeInfoValidationResults } from "./TypeParsing/Validation";
import { TypeInfoMap } from "./TypeParsing/TypeInfo";

/**
 * Search validation errors.
 * */
export const SEARCH_VALIDATION_ERRORS = {
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  RELATIONAL_FIELDS_NOT_ALLOWED: "RELATIONAL_FIELDS_NOT_ALLOWED",
  INVALID_FIELD: "INVALID_FIELD",
  INVALID_VALUE_OPTION: "INVALID_VALUE_OPTION",
  INVALID_OPERATOR: "INVALID_OPERATOR",
};

/**
 * Validate search fields against type info fields.
 * */
export const validateSearchFields = (
  typeInfoName: string,
  typeInfoMap: TypeInfoMap,
  searchFields: FieldCriterion[] = [],
  disallowRelationalFields?: boolean,
) => {
  const typeInfo = typeInfoMap[typeInfoName];
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };

  if (typeInfo) {
    const { fields = {} } = typeInfo;

    for (const f of searchFields) {
      const { fieldName, operator, customOperator, value, valueOptions } = f;

      if (
        !customOperator &&
        (!operator || !Object.values(ComparisonOperators).includes(operator))
      ) {
        results.valid = false;
        results.errorMap[fieldName] = [
          SEARCH_VALIDATION_ERRORS.INVALID_OPERATOR,
        ];
      } else {
        const tIF = fields[fieldName];

        if (tIF) {
          const { typeReference, tags = {}, possibleValues } = tIF;

          if (
            Array.isArray(possibleValues) &&
            ((Array.isArray(valueOptions) &&
              !valueOptions.every((vO) => possibleValues.includes(vO))) ||
              !possibleValues.includes(value))
          ) {
            results.valid = false;
            results.errorMap[fieldName] = [
              SEARCH_VALIDATION_ERRORS.INVALID_VALUE_OPTION,
            ];
          } else if (disallowRelationalFields && typeReference) {
            results.valid = false;
            results.errorMap[fieldName] = [
              SEARCH_VALIDATION_ERRORS.RELATIONAL_FIELDS_NOT_ALLOWED,
            ];
          } else {
            const { deniedOperations: { READ: denyRead = false } = {} } = tags;

            if (denyRead) {
              results.valid = false;
              results.errorMap[fieldName] = [
                SEARCH_VALIDATION_ERRORS.INVALID_FIELD,
              ];
            }
          }
        } else {
          results.valid = false;
          results.errorMap[fieldName] = [
            SEARCH_VALIDATION_ERRORS.INVALID_FIELD,
          ];
        }
      }
    }
  } else {
    results.valid = false;
    results.error = SEARCH_VALIDATION_ERRORS.INVALID_TYPE_INFO;
  }

  return results;
};
