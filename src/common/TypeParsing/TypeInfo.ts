/**
 * TypeInfo definitions and tags used across parsing and validation.
 */
/**
 * A set of possible operations for a type or field value.
 *
 * @category TypeInfo
 */
export enum TypeOperation {
  /**
   * Create operation.
   */
  CREATE = "CREATE",
  /**
   * Read operation.
   */
  READ = "READ",
  /**
   * Update operation.
   */
  UPDATE = "UPDATE",
  /**
   * Delete operation.
   */
  DELETE = "DELETE",
}

/**
 * A map of denied operations for a type or field value.
 * */
export type DeniedOperations = Partial<Record<TypeOperation, boolean>>;

/**
 * Voltra supported `TypeInfo` tags.
 * */
export type SupportedTags = Partial<{
  /**
   * The human-readable label for the type.
   * */
  label: string;
  /**
   * Operations that will be denied at the type level.
   * */
  deniedOperations: DeniedOperations;
  /**
   * Whether a pagination UI should enable full paging or just expect cursor-based paging.
   * */
  fullPaging: boolean;
  /**
   * Whether this type will be persisted in a storage solution.
   * */
  persisted: boolean;
}>;

/**
 * Voltra supported `TypeInfoField` tags.
 * */
export type SupportedFieldTags = Partial<{
  /**
   * Is this field the primary (uniquely identifying) field for the type?
   * */
  primaryField: boolean;
  /**
   * The human-readable label for the field.
   * */
  label: string;
  /**
   * The format or "type" for the field inout.
   * Example: "number", "email", "tel", etc.
   * */
  format: string;
  /**
   * Allows a custom entry in a select input.
   * */
  allowCustomSelection: boolean;
  /**
   * A custom type name used to process the field value with custom validators and/or other custom application features.
   * */
  customType: string;
  /**
   * Whether this field is displayed in forms, information displays, lists, etc.
   * */
  hidden: boolean;
  /**
   * Whether a pagination UI should enable full paging or just expect cursor-based paging.
   * NOTE: This is only used when the field has type reference.
   * */
  fullPaging: boolean;
  /**
   * A set of constraints for the field value.
   * */
  constraints: Partial<{
    /**
     * The default value for the field.
     */
    defaultValue: any;
    /**
     * The step increment for the field.
     * */
    step: number;
    /**
     * The minimum value for the field.
     * */
    min: number;
    /**
     * The maximum value for the field.
     * */
    max: number;
    /**
     * A regex pattern used to validate the field value.
     * */
    pattern: string;
  }>;
  /**
   * Operations that will be denied at the field level.
   * */
  deniedOperations: DeniedOperations;
  /**
   * Validation behavior overrides for field processing.
   * */
  validation: Partial<{
    /**
     * Whether hidden fields should be validated.
     * Defaults to false for data-item validation flows that opt into field-level behavior.
     */
    validateHidden: boolean;
    /**
     * Whether readonly fields should enforce required-value checks.
     * Defaults to false for data-item validation flows that opt into field-level behavior.
     */
    validateReadonly: boolean;
    /**
     * Whether empty arrays are accepted for required array fields.
     * Defaults to false.
     */
    emptyArrayIsValid: boolean;
  }>;
  /**
   * Indexing behavior flags used to derive ORM indexing configuration.
   * */
  indexed: Partial<{
    /**
     * Enable canonical scalar equality indexing.
     * */
    exact: boolean;
    /**
     * Enable collection-membership indexing. This is normally inferred for
     * indexed array fields but may be stated explicitly.
     * */
    membership: boolean;
    /**
     * Enable ordered scalar range indexing.
     * */
    range: boolean;
    /**
     * Enable normalized exact, phrase, prefix, case-insensitive, and lossy text
     * capabilities for this field.
     * */
    text: boolean;
    /**
     * Use unit-sized numeric criterion chunks for Link & Lock occupancy. This
     * has effect only on scalar numeric range fields.
     * */
    decimal: boolean;
  }>;
}>;

/**
 * The set of acceptable literal value types.
 */
export type LiteralValue = string | number | boolean | null;

/**
 * The set of acceptable type keywords.
 */
export type TypeKeyword = "string" | "number" | "boolean";

/**
 * Information about a field in a type definition.
 */
export type TypeInfoField = {
  /**
   * Scalar type keyword for the field.
   */
  type: TypeKeyword;
  /**
   * Referenced TypeInfo type name, when relational.
   */
  typeReference?: string;
  /**
   * Whether the field is an array.
   */
  array: boolean;
  /**
   * Whether the field is read-only.
   */
  readonly: boolean;
  /**
   * Whether the field is optional.
   */
  optional: boolean;
  /**
   * Allowed literal values for the field.
   */
  possibleValues?: LiteralValue[];
  /**
   * Optional field tags and constraints.
   */
  tags?: SupportedFieldTags;
};

/**
 * Information about a type definition.
 *
 * @category TypeInfo
 */
export type TypeInfo = {
  /**
   * Primary field name for the type.
   */
  primaryField?: string;
  /**
   * Map of field names to field definitions.
   */
  fields?: Record<string, TypeInfoField>;
  /**
   * Optional type-level tags.
   */
  tags?: SupportedTags;
  /**
   * Field name groupings for union type definitions.
   */
  unionFieldSets?: string[][];
};

/**
 * A map of type information maps.
 *
 * @category TypeInfo
 */
export type TypeInfoMap = Record<string, TypeInfo>;

/**
 * The necessary information to use a {@link TypeInfo} with the entire {@link TypeInfoMap} containing it.
 * */
export type TypeInfoPack = {
  /**
   * Entry type name to resolve.
   */
  entryTypeName: string;
  /**
   * Type info map containing the entry type.
   */
  typeInfoMap: TypeInfoMap;
};

/**
 * An actual data item described by type info.
 * */
export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;
