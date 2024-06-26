import { TypeInfoField, TypeInfoMap, TypeKeyword } from "./TypeInfo";

/**
 * The error message constants for primitive types.
 * */
export const PRIMITIVE_ERROR_MESSAGE_CONSTANTS: Record<TypeKeyword, string> = {
  string: "NOT_A_STRING",
  number: "NOT_A_NUMBER",
  boolean: "NOT_A_BOOLEAN",
};

/**
 * The error message constants for validation.
 */
export const ERROR_MESSAGE_CONSTANTS = {
  MISSING: "MISSING",
  INVALID_OPTION: "INVALID_OPTION",
  INVALID_FIELD: "INVALID_FIELD",
  INVALID_TYPE: "INVALID_TYPE",
  TYPE_DOES_NOT_EXIST: "TYPE_DOES_NOT_EXIST",
};

/**
 * The delimiter used to separate error paths.
 */
export const ERROR_PATH_DELIMITER = "/";

/**
 * The validation results for type info fields.
 */
export type TypeInfoValidationResults = {
  valid: boolean;
  error: string;
  errorMap: Record<string, string>;
};

/**
 * Creates an error path from parts.
 */
export const makeErrorPath = (parts: (string | number)[] = []): string =>
  parts
    .map((p) => JSON.stringify(p))
    .map(encodeURIComponent)
    .join(ERROR_PATH_DELIMITER);

/**
 * Gets the parts of an error path.
 */
export const getErrorPathParts = (errorPath: string = ""): string[] =>
  errorPath
    .split(ERROR_PATH_DELIMITER)
    .map(decodeURIComponent)
    .map((p) => JSON.parse(p));

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
 * Validates a type info field value.
 */
export const validateTypeInfoFieldValue = (
  value: any,
  typeInfoField: TypeInfoField,
  typeInfoMap: TypeInfoMap,
  ignoreArray: boolean = false,
): TypeInfoValidationResults => {
  const { type, typeReference, array, optional, options } = typeInfoField;
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };

  if (!optional && !hasValue(value)) {
    results.valid = false;
    results.error = ERROR_MESSAGE_CONSTANTS.MISSING;
  } else if (array && !ignoreArray) {
    const {
      valid: validArray,
      error: arrayError,
      errorMap: arrayErrorMap,
    } = validateArrayOfTypeInfoFieldValues(value, typeInfoField, typeInfoMap);

    results.valid = getValidityValue(results.valid, validArray);
    results.error = arrayError;
    results.errorMap = arrayErrorMap;
  } else {
    if (typeReference) {
      const {
        valid: validTypeInfo,
        error: typeInfoError,
        errorMap: typeInfoErrorMap,
      } = validateTypeInfoValue(value, typeReference, typeInfoMap);

      results.valid = getValidityValue(results.valid, validTypeInfo);
      results.error = typeInfoError;
      results.errorMap = typeInfoErrorMap;
    } else if (options && !options.includes(value)) {
      results.valid = false;
      results.error = ERROR_MESSAGE_CONSTANTS.INVALID_OPTION;
    } else {
      const pendingValid = validateKeywordType(value, type);

      results.valid = getValidityValue(results.valid, pendingValid);

      if (!results.valid) {
        results.error = PRIMITIVE_ERROR_MESSAGE_CONSTANTS[type as TypeKeyword];
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
    } = validateTypeInfoFieldValue(v, typeInfoField, typeInfoMap, true);

    results.valid = getValidityValue(results.valid, indexValid);
    results.errorMap[makeErrorPath([i])] = indexError;

    for (const er in indexErrorMap) {
      results.errorMap[makeErrorPath([i, er])] = indexErrorMap[er];
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
): TypeInfoValidationResults => {
  const typeInfo = typeInfoMap[typeInfoFullName];
  const results: TypeInfoValidationResults = {
    valid: !!typeInfo,
    error: !!typeInfo ? "" : ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST,
    errorMap: {},
  };

  if (typeInfo) {
    const { fields } = typeInfo;

    if (strict) {
      const knownFields = Object.keys(fields || {});
      const valueFields = Object.keys(value || {});

      for (const vF of valueFields) {
        if (!knownFields.includes(vF)) {
          results.valid = false;
          results.errorMap[vF] = ERROR_MESSAGE_CONSTANTS.INVALID_FIELD;
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
        } = validateTypeInfoFieldValue(fieldValue, typeInfoField, typeInfoMap);

        results.valid = getValidityValue(results.valid, fieldValid);
        results.errorMap[key] = fieldError;

        for (const fE in fieldErrorMap) {
          results.errorMap[makeErrorPath([key, fE])] = fieldErrorMap[fE];
        }
      }
    }

    if (!results.valid && !results.error) {
      results.error = ERROR_MESSAGE_CONSTANTS.INVALID_TYPE;
    }
  }

  return results;
};
