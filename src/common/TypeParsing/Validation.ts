/**
 * @packageDocumentation
 *
 * Validation helpers for TypeInfo values, including relationship rules and
 * custom type validators.
 */
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
  TypeInfoMap,
  TypeKeyword,
  TypeOperation,
} from "./TypeInfo";
import { getPathString } from "../Routing";

/**
 * Relationship validation behavior for TypeInfo checks.
 */
export enum RelationshipValidationType {
  /**
   * Include relationship values in validation.
   */
  INCLUDE = "INCLUDE",
  /**
   * Exclude relationship values from validation.
   */
  EXCLUDE = "EXCLUDE",
  /**
   * Disallow relationship values entirely.
   */
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
 * A custom field validator that can return a domain-specific error descriptor.
 */
export type FieldValueValidator = (
  value: any,
  typeInfoField: TypeInfoField,
) => ErrorDescriptor;

/**
 * A map of custom field validators by field key.
 */
export type FieldValueValidatorMap = Record<string, FieldValueValidator>;

/**
 * Error code for custom type validation failures.
 */
export const INVALID_CUSTOM_TYPE = "INVALID_CUSTOM_TYPE";

/**
 * Error codes for primitive type validation failures.
 *
 * Keys intentionally match `typeof value` results.
 */
export const PRIMITIVE_ERROR_MESSAGE_CONSTANTS = {
  string: "NOT_A_STRING",
  number: "NOT_A_NUMBER",
  boolean: "NOT_A_BOOLEAN",
} as const;

/**
 * Error codes for denied type operations.
 *
 * Keys intentionally match `TypeOperation` names.
 */
export const DENIED_TYPE_OPERATIONS = {
  CREATE: "DENIED_TYPE_OPERATION_CREATE",
  READ: "DENIED_TYPE_OPERATION_READ",
  UPDATE: "DENIED_TYPE_OPERATION_UPDATE",
  DELETE: "DENIED_TYPE_OPERATION_DELETE",
} as const;

/**
 * Error codes for TypeInfo validation failures.
 *
 * Uses canonical string-valued keys (for example `NOT_A_STRING` and
 * `DENIED_TYPE_OPERATION_CREATE`) so consumers can key by code values.
 */
export const ERROR_MESSAGE_CONSTANTS = {
  NONE: "NONE",
  INVALID_CUSTOM_TYPE,
  [PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string]:
    PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string,
  [PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number]:
    PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number,
  [PRIMITIVE_ERROR_MESSAGE_CONSTANTS.boolean]:
    PRIMITIVE_ERROR_MESSAGE_CONSTANTS.boolean,
  [DENIED_TYPE_OPERATIONS.CREATE]: DENIED_TYPE_OPERATIONS.CREATE,
  [DENIED_TYPE_OPERATIONS.READ]: DENIED_TYPE_OPERATIONS.READ,
  [DENIED_TYPE_OPERATIONS.UPDATE]: DENIED_TYPE_OPERATIONS.UPDATE,
  [DENIED_TYPE_OPERATIONS.DELETE]: DENIED_TYPE_OPERATIONS.DELETE,
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
  VALUE_BELOW_MINIMUM: "VALUE_BELOW_MINIMUM",
  VALUE_ABOVE_MAXIMUM: "VALUE_ABOVE_MAXIMUM",
} as const;

export type ErrorCode =
  (typeof ERROR_MESSAGE_CONSTANTS)[keyof typeof ERROR_MESSAGE_CONSTANTS];

/**
 * Primitive type keyword to error code mapping used during validation.
 */
export const TYPE_KEYWORD_ERROR_MESSAGE_CONSTANTS: Record<
  TypeKeyword,
  ErrorCode
> = {
  string: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.string,
  number: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.number,
  boolean: PRIMITIVE_ERROR_MESSAGE_CONSTANTS.boolean,
};

/**
 * A descriptor for a validation error.
 */
export type ErrorDescriptor = {
  code: ErrorCode | string;
  values?: string[];
};

/**
 * A map of errors.
 */
export type ErrorMap = {
  [key: string]: ErrorDescriptor[];
};

/**
 * The validation results for type info fields.
 */
export type TypeInfoValidationResults = {
  /**
   * Type name being validated.
   */
  typeName: string | null;
  /**
   * Whether the validation passed.
   */
  valid: boolean;
  /**
   * Primary error code when validation fails.
   */
  error: ErrorDescriptor;
  /**
   * Field-level error mapping.
   */
  errorMap: ErrorMap;
};

/**
 * Creates an error descriptor from a code and optional values.
 */
export const getErrorDescriptor = (
  code: ErrorCode | string = ERROR_MESSAGE_CONSTANTS.NONE,
  values?: string[],
): ErrorDescriptor => ({
  code,
  values,
});

/**
 * Creates a descriptor representing the absence of an error.
 */
export const getNoErrorDescriptor = (): ErrorDescriptor =>
  getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.NONE);

/**
 * Validates a value against a pattern.
 *
 * `value` must be a string or not supplied.
 * `pattern` must be a string or not supplied.
 *
 * If either are not supplied, the result is valid.
 *
 * @param typeName - Type name for the validation context.
 * @param value - Value to validate.
 * @param pattern - Regex pattern to validate against.
 * @returns Validation results for the pattern.
 * */
export const validateValueMatchesPattern = (
  typeName: string,
  value?: any,
  pattern?: string,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    typeName,
    valid: true,
    error: getNoErrorDescriptor(),
    errorMap: {},
  };
  const valueSupplied = typeof value !== "undefined";
  const patternSupplied = typeof pattern === "string" && pattern.trim() !== "";

  if (valueSupplied && patternSupplied) {
    try {
      const regex = new RegExp(pattern as string);
      const testResult = typeof value === "string" && regex.test(value);

      if (!testResult) {
        results.valid = false;
        results.error = getErrorDescriptor(
          ERROR_MESSAGE_CONSTANTS.VALUE_DOES_NOT_MATCH_PATTERN,
        );
      }
    } catch (e) {
      results.valid = false;
      results.error = getErrorDescriptor(
        ERROR_MESSAGE_CONSTANTS.INVALID_PATTERN,
      );
    }
  }

  return results;
};

/**
 * Gets the validity value.
 *
 * @param existing - Current validity value.
 * @param pending - New validity value.
 * @returns Updated validity value.
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
 *
 * @param value - Value to check.
 * @returns Whether the value is present.
 */
export const hasValue = (value: any): boolean => value ?? false;

/**
 * Validates a primitive value.
 *
 * @param value - Value to validate.
 * @param type - Primitive type keyword.
 * @returns Whether the value matches the type.
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
 *
 * @param value - Value to validate.
 * @param customType - Custom type name.
 * @param customValidators - Custom validators map.
 * @returns Whether the value passes custom validation.
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
 *
 * @param value - Value to validate.
 * @param typeInfoField - Field metadata.
 * @param typeInfoMap - Type info map for referenced types.
 * @param ignoreArray - Whether to ignore array validation.
 * @param strict - Whether to validate unknown fields and unions strictly.
 * @param customValidators - Custom validators map.
 * @param typeOperation - Operation being validated.
 * @param relationshipValidationType - Relationship validation behavior.
 * @param itemIsPartial - Whether the item is partial.
 * @returns Validation results for the field.
 */
export const validateTypeInfoFieldValue = (
  value: any,
  typeInfoField: TypeInfoField,
  typeInfoMap: TypeInfoMap,
  ignoreArray: boolean = false,
  strict: boolean = false,
  customValidators?: CustomTypeInfoFieldValidatorMap,
  typeOperation?: TypeOperation,
  relationshipValidationType: RelationshipValidationType = RelationshipValidationType.STRICT_EXCLUDE,
  itemIsPartial?: boolean,
): TypeInfoValidationResults => {
  const {
    type,
    typeReference,
    array,
    optional,
    possibleValues,
    tags: {
      customType,
      validation: {
        emptyArrayIsValid: emptyArrayIsValidOverride = undefined,
      } = {},
      constraints: {
        pattern = undefined,
        min = undefined,
        max = undefined,
      } = {},
    } = {},
  } = typeInfoField;
  const results: TypeInfoValidationResults = {
    typeName: typeReference ?? type,
    valid: true,
    error: getNoErrorDescriptor(),
    errorMap: {},
  };
  const requiredValueAllowed: boolean =
    !typeReference ||
    relationshipValidationType === RelationshipValidationType.INCLUDE;

  const valueIsUndefined = typeof value === "undefined";
  const valueIsNull = value === null;

  const canSkipValidation =
    (itemIsPartial && (valueIsUndefined || valueIsNull)) ||
    (optional && valueIsUndefined);
  const emptyArrayIsValid = emptyArrayIsValidOverride ?? false;

  if (canSkipValidation) {
    results.valid = true;
  } else if (
    requiredValueAllowed &&
    !itemIsPartial &&
    !optional &&
    !hasValue(value)
  ) {
    results.valid = false;
    results.error = getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.MISSING);
  } else if (array && !ignoreArray && !Array.isArray(value)) {
    results.valid = false;
    results.error = getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.INVALID_TYPE);
  } else if (
    array &&
    !ignoreArray &&
    !optional &&
    Array.isArray(value) &&
    value.length === 0 &&
    !emptyArrayIsValid
  ) {
    results.valid = false;
    results.error = getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.MISSING);
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
      if (relationshipValidationType === RelationshipValidationType.INCLUDE) {
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
          results.error = getErrorDescriptor(
            ERROR_MESSAGE_CONSTANTS.RELATIONSHIP_VALUES_ARE_STRICTLY_EXCLUDED,
          );
        }
      } else if (
        relationshipValidationType === RelationshipValidationType.EXCLUDE
      ) {
        // NOTE: This is just here to explicitly demonstrate the intended outcome.
        results.valid = getValidityValue(results.valid, true);
      }
    } else if (possibleValues && !possibleValues.includes(value)) {
      results.valid = false;
      results.error = getErrorDescriptor(
        ERROR_MESSAGE_CONSTANTS.INVALID_OPTION,
      );
    } else {
      const pendingValid = validateKeywordType(value, type);
      const customValid = validateCustomType(
        value,
        customType,
        customValidators,
      );

      results.valid = getValidityValue(results.valid, pendingValid);
      results.valid = getValidityValue(results.valid, customValid);

      if (type === "string" && typeof pattern === "string") {
        const { valid: patternValid, error: patternError } =
          validateValueMatchesPattern(typeReference ?? type, value, pattern);

        results.valid = getValidityValue(results.valid, patternValid);
        results.error = patternError;
      }

      if (type === "number" && typeof value === "number") {
        if (typeof min === "number" && value < min) {
          results.valid = false;
          results.error = getErrorDescriptor(
            ERROR_MESSAGE_CONSTANTS.VALUE_BELOW_MINIMUM,
            [`${min}`],
          );
        } else if (typeof max === "number" && value > max) {
          results.valid = false;
          results.error = getErrorDescriptor(
            ERROR_MESSAGE_CONSTANTS.VALUE_ABOVE_MAXIMUM,
            [`${max}`],
          );
        }
      }

      if (!customValid) {
        results.error = getErrorDescriptor(
          ERROR_MESSAGE_CONSTANTS.INVALID_CUSTOM_TYPE,
        );
      } else if (!results.valid) {
        results.error =
          results.error.code !== ERROR_MESSAGE_CONSTANTS.NONE
            ? results.error
            : getErrorDescriptor(
                TYPE_KEYWORD_ERROR_MESSAGE_CONSTANTS[type as TypeKeyword],
              );
      }
    }
  }

  return results;
};

/**
 * Validates an array of type info field values.
 *
 * @param values - Values to validate.
 * @param typeInfoField - Field metadata.
 * @param typeInfoMap - Type info map for referenced types.
 * @param strict - Whether to validate unknown fields and unions strictly.
 * @param customValidators - Custom validators map.
 * @param typeOperation - Operation being validated.
 * @param relationshipValidationType - Relationship validation behavior.
 * @param itemIsPartial - Whether the item is partial.
 * @returns Validation results for the array.
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
  const { type, typeReference } = typeInfoField;
  const results: TypeInfoValidationResults = {
    typeName: typeReference ?? type,
    valid: true,
    error: getNoErrorDescriptor(),
    errorMap: {},
  };

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const {
      valid: indexValid,
      error: indexError = getNoErrorDescriptor(),
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
 *
 * @param fieldName - Field name to validate.
 * @param fieldOperation - Operation to validate.
 * @param typeInfoField - Field metadata.
 * @returns Validation results for the field operation.
 * */
export const validateTypeInfoFieldOperationAllowed = (
  fieldName: string,
  fieldOperation?: TypeOperation,
  typeInfoField?: TypeInfoField,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    typeName: null,
    valid: true,
    error: getNoErrorDescriptor(),
    errorMap: {},
  };

  if (fieldOperation && typeInfoField) {
    const {
      type,
      typeReference,
      tags = {},
    }: Partial<TypeInfoField> = typeInfoField || {};
    const { deniedOperations: { [fieldOperation]: denied = false } = {} } =
      tags;

    results.typeName = typeReference ?? type;

    results.valid = !denied;

    if (!results.valid) {
      results.error = getErrorDescriptor(
        DENIED_TYPE_OPERATIONS[fieldOperation],
      );

      results.errorMap[fieldName] = [results.error];
    }
  }

  return results;
};

/**
 * Validates a type info operation.
 *
 * @param typeName - Type name to validate.
 * @param valueFields - Fields included in the operation.
 * @param typeOperation - Operation to validate.
 * @param typeInfo - Type info metadata.
 * @returns Validation results for the type operation.
 * */
export const validateTypeOperationAllowed = (
  typeName: string,
  valueFields: string[],
  typeOperation: TypeOperation,
  typeInfo: TypeInfo,
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    typeName,
    valid: true,
    error: getNoErrorDescriptor(),
    errorMap: {},
  };
  const { fields = {}, tags = {} } = typeInfo;
  const { deniedOperations: { [typeOperation]: denied = false } = {} } = tags;

  if (denied) {
    results.valid = false;
    results.error = getErrorDescriptor(DENIED_TYPE_OPERATIONS[typeOperation]);
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
 * Options for validating a data item against a single TypeInfo definition.
 */
export type ValidateTypeInfoDataItemOptions = {
  /**
   * Type name used for result metadata and nested lookups.
   */
  typeName?: string;
  /**
   * Additional types used for nested type references.
   */
  typeInfoMap?: TypeInfoMap;
  /**
   * Whether unknown fields should fail validation.
   */
  strict?: boolean;
  /**
   * Custom validators for `tags.customType` handling.
   */
  customTypeValidators?: CustomTypeInfoFieldValidatorMap;
  /**
   * Operation context for denied operation checks.
   */
  typeOperation?: TypeOperation;
  /**
   * Relationship validation behavior.
   */
  relationshipValidationType?: RelationshipValidationType;
  /**
   * Whether this is a partial payload.
   */
  itemIsPartial?: boolean;
  /**
   * Default hidden-field validation behavior.
   */
  validateHidden?: boolean;
  /**
   * Default readonly-field required-value behavior.
   */
  validateReadonly?: boolean;
};

const TYPE_INFO_DATA_ITEM_TYPE_NAME = "__TYPE_INFO_DATA_ITEM__";

/**
 * Validates a data item against a TypeInfo definition.
 *
 * @param value - Data item to validate.
 * @param typeInfo - TypeInfo definition used for validation.
 * @param customValidatorMap - Optional custom validators keyed by field.
 * @param options - Validation behavior options.
 * @returns Validation result for the entire item.
 */
export const validateTypeInfoDataItem = (
  value: Partial<TypeInfoDataItem> = {},
  typeInfo: TypeInfo,
  customValidatorMap: FieldValueValidatorMap = {},
  options?: ValidateTypeInfoDataItemOptions,
): TypeInfoValidationResults => {
  const {
    typeName = TYPE_INFO_DATA_ITEM_TYPE_NAME,
    typeInfoMap = {},
    strict = true,
    customTypeValidators,
    typeOperation = TypeOperation.CREATE,
    relationshipValidationType = RelationshipValidationType.STRICT_EXCLUDE,
    itemIsPartial = typeOperation === TypeOperation.UPDATE,
    validateHidden = false,
    validateReadonly = false,
  } = options ?? {};
  const sourceFields = typeInfo.fields ?? {};
  const normalizedFields: NonNullable<TypeInfo["fields"]> = {};

  for (const [fieldName, field] of Object.entries(sourceFields)) {
    const validationTags = field.tags?.validation ?? {};
    const shouldValidateHidden =
      validationTags.validateHidden ?? validateHidden;
    const shouldValidateReadonly =
      validationTags.validateReadonly ?? validateReadonly;
    const shouldSkipRequiredChecks =
      (field.tags?.hidden && !shouldValidateHidden) ||
      (field.readonly && !shouldValidateReadonly);

    normalizedFields[fieldName] = shouldSkipRequiredChecks
      ? {
          ...field,
          optional: true,
        }
      : field;
  }

  const normalizedTypeInfo: TypeInfo = {
    ...typeInfo,
    fields: normalizedFields,
  };
  const results = validateTypeInfoValue(
    value ?? {},
    typeName,
    { ...typeInfoMap, [typeName]: normalizedTypeInfo },
    strict,
    customTypeValidators,
    typeOperation,
    relationshipValidationType,
    itemIsPartial,
  );

  for (const [fieldName, validator] of Object.entries(customValidatorMap)) {
    const field = normalizedFields[fieldName];

    if (!field) {
      continue;
    }

    let error = getNoErrorDescriptor();
    try {
      error = validator(value[fieldName], field);
    } catch (e) {
      error = getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.INVALID_CUSTOM_TYPE);
    }

    if (error.code !== ERROR_MESSAGE_CONSTANTS.NONE) {
      results.valid = false;
      results.errorMap[fieldName] = [
        ...(results.errorMap[fieldName] ?? []),
        error,
      ];

      if (results.error.code === ERROR_MESSAGE_CONSTANTS.NONE) {
        results.error = error;
      }
    }
  }

  return results;
};

/**
 * Validates a type info value.
 *
 * @param value - Value to validate.
 * @param typeInfoFullName - Fully qualified type name.
 * @param typeInfoMap - Type info map for referenced types.
 * @param strict - Whether to validate unknown fields and unions strictly.
 * @param customValidators - Custom validators map.
 * @param typeOperation - Operation being validated.
 * @param relationshipValidationType - Relationship validation behavior.
 * @param itemIsPartial - Whether the item is partial.
 * @returns Validation results for the value.
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
    typeName: typeInfoFullName,
    valid: !!typeInfo,
    error: !!typeInfo
      ? getNoErrorDescriptor()
      : getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST),
    errorMap: {},
  };

  if (typeInfo) {
    const { primaryField, fields, unionFieldSets } = typeInfo;

    if (typeOperation) {
      const valueFields =
        typeof value === "object" ? Object.keys(value ?? {}) : [];
      const {
        valid: operationValid,
        error: operationError,
        errorMap: operationErrorMap,
      } = validateTypeOperationAllowed(
        typeInfoFullName,
        valueFields,
        typeOperation,
        typeInfo,
      );

      results.valid = getValidityValue(results.valid, operationValid);
      results.error = operationError;

      for (const oE in operationErrorMap) {
        const existingError = results.errorMap[oE] ?? [];

        results.errorMap[oE] = existingError
          ? [...existingError, ...operationErrorMap[oE]]
          : operationErrorMap[oE];
      }

      if (
        !operationValid &&
        operationError.code !== ERROR_MESSAGE_CONSTANTS.NONE
      ) {
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
        results.error = getErrorDescriptor(
          ERROR_MESSAGE_CONSTANTS.NO_UNION_TYPE_MATCHED,
        );
      }
    } else if (strict) {
      const knownFields = Object.keys(fields || {});
      const valueFields = Object.keys(value || {});

      for (const vF of valueFields) {
        if (!knownFields.includes(vF)) {
          results.valid = false;
          results.errorMap[vF] = [
            getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.INVALID_FIELD),
          ];
        }
      }
    }

    if (fields) {
      for (const key in fields) {
        // IMPORTANT: Only validate the primary field when not creating.
        if (
          typeOperation !== TypeOperation.CREATE ||
          typeof primaryField !== "string" ||
          key !== primaryField
        ) {
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
    }

    if (!results.valid && results.error.code === ERROR_MESSAGE_CONSTANTS.NONE) {
      results.error = getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.INVALID_TYPE);
    }
  }

  return results;
};
