import { ComparisonOperators, FieldCriterion } from "./SearchTypes";
import {
  CustomTypeInfoFieldValidatorMap,
  RelationshipValidationType,
  TypeInfoValidationResults,
  validateTypeInfoFieldValue,
} from "./TypeParsing/Validation";
import { TypeInfoMap, TypeOperation } from "./TypeParsing/TypeInfo";
import { getPathString } from "./Routing";

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
  customValidators?: CustomTypeInfoFieldValidatorMap,
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
          const { typeReference, tags = {} } = tIF;
          const { deniedOperations: { READ: denyRead = false } = {} } = tags;

          if (denyRead) {
            results.valid = false;
            results.errorMap[fieldName] = [
              SEARCH_VALIDATION_ERRORS.INVALID_FIELD,
            ];
          } else if (disallowRelationalFields && typeReference) {
            results.valid = false;
            results.errorMap[fieldName] = [
              SEARCH_VALIDATION_ERRORS.RELATIONAL_FIELDS_NOT_ALLOWED,
            ];
          } else {
            const targetValueOptions = Array.isArray(valueOptions)
              ? valueOptions
              : [value];

            for (const tVO of targetValueOptions) {
              const { valid: valueIsValid, errorMap: valueErrorMap } =
                validateTypeInfoFieldValue(
                  tVO,
                  tIF,
                  typeInfoMap,
                  false,
                  true,
                  customValidators,
                  TypeOperation.READ,
                  disallowRelationalFields
                    ? RelationshipValidationType.STRICT_EXCLUDE
                    : RelationshipValidationType.INCLUDE,
                  true,
                );

              if (!valueIsValid) {
                results.valid = false;

                for (const fE in valueErrorMap) {
                  results.errorMap[getPathString([fieldName, fE])] =
                    valueErrorMap[fE];
                }
              }
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
