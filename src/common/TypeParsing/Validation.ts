import {
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
  TypeKeyword,
  TypeOperation,
} from "./TypeInfo";
import { getPathString } from "../Routing";

export enum RelationshipValidationType {
  INCLUDE = "INCLUDE",
  EXCLUDE = "EXCLUDE",
  STRICT_EXCLUDE = "STRICT_EXCLUDE",
}

/**
 * A custom type info field validator.
 * */
export type CustomTypeInfoFieldValidator = (value: any) => boolean;

/**
 * A map of custom type info field validators.
 * */
export type CustomTypeInfoFieldValidatorMap = Record<
  string,
  CustomTypeInfoFieldValidator
>;

/**
 * A map of errors.
 * */
export type ErrorMap = {
  [key: string]: (string | ErrorMap)[];
};

/**
 * The validation results for type info fields.
 */
export type TypeInfoValidationResults = {
  valid: boolean;
  error: string;
  errorMap: ErrorMap;
};

export const INVALID_CUSTOM_TYPE = "INVALID_CUSTOM_TYPE";

export const PRIMITIVE_ERROR_MESSAGE_CONSTANTS: Record<TypeKeyword, string> = {
  string: "NOT_A_STRING",
  number: "NOT_A_NUMBER",
  boolean: "NOT_A_BOOLEAN",
};

export const ERROR_MESSAGE_CONSTANTS = {
  MISSING: "MISSING",
  INVALID_OPTION: "INVALID_OPTION",
  INVALID_FIELD: "INVALID_FIELD",
  RELATIONSHIP_VALUES_ARE_STRICTLY_EXCLUDED:
    "RELATIONSHIP_VALUES_ARE_STRICTLY_EXCLUDED",
  INVALID_TYPE: "INVALID_TYPE",
  NO_UNION_TYPE_MATCHED: "NO_UNION_TYPE_MATCHED",
  TYPE_DOES_NOT_EXIST: "TYPE_DOES_NOT_EXIST",
  INVALID_PATTERN: "INVALID_PATTERN",
  VALUE_DOES_NOT_MATCH_PATTERN: "VALUE_DOES_NOT_MATCH_PATTERN",
};

export const DENIED_TYPE_OPERATIONS: Record<TypeOperation, string> = {
  CREATE: "DENIED_TYPE_OPERATION_CREATE",
  READ: "DENIED_TYPE_OPERATION_READ",
  UPDATE: "DENIED_TYPE_OPERATION_UPDATE",
  DELETE: "DENIED_TYPE_OPERATION_DELETE",
};

/**
 * Validates a value against a pattern.
 *
 * `value` must be a string or not supplied.
 * `pattern` must be a string or not supplied.
 *
 * If either are not supplied, the result is valid.
 * */
export const validateValueMatchesPattern = (
  value?: any,
  pattern?: string,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };
  const valueSupplied = typeof value !== "undefined";
  const patternSupplied = typeof pattern === "string" && pattern.trim() !== "";

  if (!valueSupplied || !patternSupplied) {
    try {
      const regex = new RegExp(pattern as string);
      const testResult = typeof value === "string" && regex.test(value);

      if (!testResult) {
        results.valid = false;
        results.error = ERROR_MESSAGE_CONSTANTS.VALUE_DOES_NOT_MATCH_PATTERN;
      }
    } catch (e) {
      results.valid = false;
      results.error = ERROR_MESSAGE_CONSTANTS.INVALID_PATTERN;
    }
  }

  return results;
};

/**
 * Gets the validity value.
 */
export const getValidityValue = (
  existing: boolean,
  pending: boolean,
): boolean => (!existing ? false : pending);

/**
 * The validators for primitive values.
 */
export const TYPE_KEYWORD_VALIDATORS: Record<
  TypeKeyword,
  (value: any) => boolean
> = {
  string: (value) => typeof value === "string",
  number: (value) => typeof value === "number",
  boolean: (value) => typeof value === "boolean",
};

/**
 * Checks if a value has a value.
 */
export const hasValue = (value: any): boolean => value ?? false;

/**
 * Validates a primitive value.
 */
export const validateKeywordType = (value: any, type: string): boolean => {
  const validator = TYPE_KEYWORD_VALIDATORS[type as TypeKeyword];

  let valid = true;

  if (validator) {
    valid = validator(value);
  }

  return valid;
};

/**
 * Validates a custom type.
 */
export const validateCustomType = (
  value: any,
  customType?: string,
  customValidators?: CustomTypeInfoFieldValidatorMap,
): boolean => {
  let valid = true;

  if (customValidators && customType) {
    const validator = customValidators[customType];

    if (validator) {
      try {
        valid = validator(value);
      } catch (e) {
        valid = false;
      }
    }
  }

  return valid;
};

/**
 * Validates a type info field value.
 */
export const validateTypeInfoFieldValue = (
  value: any,
  typeInfoField: TypeInfoField,
  typeInfoMap: TypeInfoMap,
  ignoreArray: boolean = false,
  strict: boolean = false,
  customValidators?: CustomTypeInfoFieldValidatorMap,
  typeOperation?: TypeOperation,
  relationshipValidationType?: RelationshipValidationType,
  itemIsPartial?: boolean,
): TypeInfoValidationResults => {
  const {
    type,
    typeReference,
    array,
    optional,
    possibleValues,
    tags: { customType, constraints: { pattern = undefined } = {} } = {},
  } = typeInfoField;
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };

  if (!itemIsPartial && !optional && !hasValue(value)) {
    results.valid = false;
    results.error = ERROR_MESSAGE_CONSTANTS.MISSING;
  } else if (array && !ignoreArray) {
    const {
      valid: validArray,
      error: arrayError,
      errorMap: arrayErrorMap,
    } = validateArrayOfTypeInfoFieldValues(
      value,
      typeInfoField,
      typeInfoMap,
      strict,
      customValidators,
      typeOperation,
      relationshipValidationType,
      itemIsPartial,
    );

    results.valid = getValidityValue(results.valid, validArray);
    results.error = arrayError;
    results.errorMap = arrayErrorMap;
  } else {
    if (typeReference) {
      if (
        typeof relationshipValidationType === "undefined" ||
        relationshipValidationType === RelationshipValidationType.INCLUDE
      ) {
        const {
          valid: validTypeInfo,
          error: typeInfoError,
          errorMap: typeInfoErrorMap,
        } = validateTypeInfoValue(
          value,
          typeReference,
          typeInfoMap,
          strict,
          customValidators,
          typeOperation,
          relationshipValidationType,
          itemIsPartial,
        );

        results.valid = getValidityValue(results.valid, validTypeInfo);
        results.error = typeInfoError;
        results.errorMap = typeInfoErrorMap;
      } else if (
        relationshipValidationType === RelationshipValidationType.STRICT_EXCLUDE
      ) {
        const valueSupplied = typeof value !== "undefined";

        if (valueSupplied) {
          results.valid = false;
          results.error =
            ERROR_MESSAGE_CONSTANTS.RELATIONSHIP_VALUES_ARE_STRICTLY_EXCLUDED;
        }
      }
    } else if (possibleValues && !possibleValues.includes(value)) {
      results.valid = false;
      results.error = ERROR_MESSAGE_CONSTANTS.INVALID_OPTION;
    } else {
      const pendingValid = validateKeywordType(value, type);
      const customValid = validateCustomType(
        value,
        customType,
        customValidators,
      );

      results.valid = getValidityValue(results.valid, pendingValid);
      results.valid = getValidityValue(results.valid, customValid);

      if (type === "string") {
        const { valid: patternValid, error: patternError } =
          validateValueMatchesPattern(value, pattern);

        results.valid = getValidityValue(results.valid, patternValid);
        results.error = patternError;
      }

      if (!customValid) {
        results.error = INVALID_CUSTOM_TYPE;
      } else if (!results.valid) {
        results.error = results.error
          ? results.error
          : PRIMITIVE_ERROR_MESSAGE_CONSTANTS[type as TypeKeyword];
      }
    }
  }

  return results;
};

/**
 * Validates an array of type info field values.
 */
export const validateArrayOfTypeInfoFieldValues = (
  values: any[] = [],
  typeInfoField: TypeInfoField,
  typeInfoMap: TypeInfoMap,
  strict: boolean = false,
  customValidators?: CustomTypeInfoFieldValidatorMap,
  typeOperation?: TypeOperation,
  relationshipValidationType?: RelationshipValidationType,
  itemIsPartial?: boolean,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const {
      valid: indexValid,
      error: indexError = "",
      errorMap: indexErrorMap,
    } = validateTypeInfoFieldValue(
      v,
      typeInfoField,
      typeInfoMap,
      true,
      strict,
      customValidators,
      typeOperation,
      relationshipValidationType,
      itemIsPartial,
    );

    results.valid = getValidityValue(results.valid, indexValid);
    results.errorMap[getPathString([i])] = [indexError];

    for (const er in indexErrorMap) {
      results.errorMap[getPathString([i, er])] = indexErrorMap[er];
    }
  }

  return results;
};

/**
 * Validates a type info field operation.
 * */
export const validateTypeInfoFieldOperationAllowed = (
  fieldName: string,
  fieldOperation?: TypeOperation,
  typeInfoField?: TypeInfoField,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };

  if (fieldOperation && typeInfoField) {
    const { tags = {} }: Partial<TypeInfoField> = typeInfoField || {};
    const { deniedOperations: { [fieldOperation]: denied = false } = {} } =
      tags;

    results.valid = !denied;

    if (!results.valid) {
      results.error = DENIED_TYPE_OPERATIONS[fieldOperation];

      results.errorMap[fieldName] = [results.error];
    }
  }

  return results;
};

/**
 * Validates a type info operation.
 * */
export const validateTypeOperationAllowed = (
  valueFields: string[],
  typeOperation: TypeOperation,
  typeInfo: TypeInfo,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };
  const { fields = {}, tags = {} } = typeInfo;
  const { deniedOperations: { [typeOperation]: denied = false } = {} } = tags;

  if (denied) {
    results.valid = false;
    results.error = DENIED_TYPE_OPERATIONS[typeOperation];
  } else {
    for (const vF of valueFields) {
      const vFieldInfo = fields[vF];
      const { valid: vFValid, error: vFError } =
        validateTypeInfoFieldOperationAllowed(vF, typeOperation, vFieldInfo);

      results.valid = getValidityValue(results.valid, vFValid);

      if (!vFValid) {
        results.errorMap[vF] = [vFError];
      }
    }
  }

  return results;
};

/**
 * Validates a type info value.
 */
export const validateTypeInfoValue = (
  value: any,
  typeInfoFullName: string,
  typeInfoMap: TypeInfoMap,
  strict: boolean = false,
  customValidators?: CustomTypeInfoFieldValidatorMap,
  typeOperation?: TypeOperation,
  relationshipValidationType?: RelationshipValidationType,
  itemIsPartial?: boolean,
): TypeInfoValidationResults => {
  const typeInfo = typeInfoMap[typeInfoFullName];
  const results: TypeInfoValidationResults = {
    valid: !!typeInfo,
    error: !!typeInfo ? "" : ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST,
    errorMap: {},
  };

  if (typeInfo) {
    const { fields, unionFieldSets } = typeInfo;

    if (typeOperation) {
      const valueFields =
        typeof value === "object" ? Object.keys(value ?? {}) : [];
      const {
        valid: operationValid,
        error: operationError,
        errorMap: operationErrorMap,
      } = validateTypeOperationAllowed(valueFields, typeOperation, typeInfo);

      results.valid = getValidityValue(results.valid, operationValid);
      results.error = operationError;

      for (const oE in operationErrorMap) {
        const existingError = results.errorMap[oE] ?? [];

        results.errorMap[oE] = existingError
          ? [...existingError, ...operationErrorMap[oE]]
          : operationErrorMap[oE];
      }

      if (!operationValid && operationError) {
        results.error = operationError;
      }
    }

    if (unionFieldSets) {
      const valueFields = Object.keys(value || {});

      let valid = false;

      for (const uFS of unionFieldSets) {
        // IMPORTANT: One of the union field sets MUST contain all of the value fields.
        valid = valueFields.every((vF) => uFS.includes(vF));

        if (valid) {
          break;
        }
      }

      if (!valid) {
        results.valid = false;
        results.error = ERROR_MESSAGE_CONSTANTS.NO_UNION_TYPE_MATCHED;
      }
    } else if (strict) {
      const knownFields = Object.keys(fields || {});
      const valueFields = Object.keys(value || {});

      for (const vF of valueFields) {
        if (!knownFields.includes(vF)) {
          results.valid = false;
          results.errorMap[vF] = [ERROR_MESSAGE_CONSTANTS.INVALID_FIELD];
        }
      }
    }

    if (fields) {
      for (const key in fields) {
        const typeInfoField = fields[key];
        const fieldValue = value[key];
        const {
          valid: fieldValid,
          error: fieldError,
          errorMap: fieldErrorMap,
        } = validateTypeInfoFieldValue(
          fieldValue,
          typeInfoField,
          typeInfoMap,
          false,
          strict,
          customValidators,
          typeOperation,
          relationshipValidationType,
          itemIsPartial,
        );

        results.valid = getValidityValue(results.valid, fieldValid);
        results.errorMap[key] = [fieldError];

        for (const fE in fieldErrorMap) {
          results.errorMap[getPathString([key, fE])] = fieldErrorMap[fE];
        }
      }
    }

    if (!results.valid && !results.error) {
      results.error = ERROR_MESSAGE_CONSTANTS.INVALID_TYPE;
    }
  }

  return results;
};
