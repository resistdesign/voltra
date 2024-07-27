export type TypeOperation = "create" | "read" | "update" | "delete";

/**
 * Voltra supported `TypeInfo` tags.
 * */
export type SupportedTags = {
  label?: string;
  deniedOperations?: Record<TypeOperation, boolean>;
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
  deniedOperations?: Record<TypeOperation, boolean>;
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
