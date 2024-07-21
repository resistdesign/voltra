/**
 * Voltra supported `TypeInfoField` tags.
 * */
export type SupportedTags = {
  primaryField?: boolean;
  label?: string;
  format?: string;
  allowCustomSelection?: boolean;
  customInputType?: string;
  hidden?: boolean;
  constraints?: {
    defaultValue?: any;
    step?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
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
  tags?: SupportedTags & Record<any, any>;
};

/**
 * Information about a type definition.
 */
export type TypeInfo = {
  primaryField?: string;
  fields?: Record<string, TypeInfoField>;
  tags?: Record<any, any>;
  unionFieldSets?: string[][];
};

/**
 * A map of type information maps.
 */
export type TypeInfoMap = Record<string, TypeInfo>;
