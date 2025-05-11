/**
 * A set of possible operations for a type or field value.
 * */
export enum TypeOperation {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
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
  type: TypeKeyword;
  typeReference?: string;
  array: boolean;
  readonly: boolean;
  optional: boolean;
  possibleValues?: LiteralValue[];
  tags?: SupportedFieldTags;
};

/**
 * Information about a type definition.
 */
export type TypeInfo = {
  primaryField?: string;
  fields?: Record<string, TypeInfoField>;
  tags?: SupportedTags;
  unionFieldSets?: string[][];
};

/**
 * A map of type information maps.
 */
export type TypeInfoMap = Record<string, TypeInfo>;

/**
 * The necessary information to use a {@link TypeInfo} with the entire {@link TypeInfoMap} containing it.
 * */
export type TypeInfoPack = {
  entryTypeName: string;
  typeInfoMap: TypeInfoMap;
};

/**
 * An actual data item described by type info.
 * */
export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;
