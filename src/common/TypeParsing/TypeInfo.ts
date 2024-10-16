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
export type SupportedTags = {
  label?: string;
  deniedOperations?: DeniedOperations;
  fullPaging?: boolean;
};

/**
 * Voltra supported `TypeInfoField` tags.
 * */
export type SupportedFieldTags = {
  primaryField?: boolean;
  label?: string;
  format?: string;
  allowCustomSelection?: boolean;
  customType?: string;
  hidden?: boolean;
  constraints?: {
    defaultValue?: any;
    step?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  deniedOperations?: DeniedOperations;
};

/**
 * The set of acceptable literal value types.
 */
export type LiteralValue = string | number | boolean | null | undefined;

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
 * An actual data item described by type info.
 * */
export type TypeInfoDataItem = Record<string, LiteralValue | LiteralValue[]>;
