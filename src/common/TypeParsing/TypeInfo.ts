export type LiteralValue = string | number | boolean | null | undefined;

export type TypeKeyword = 'string' | 'number' | 'boolean';

export type TypeInfoField = {
  type: TypeKeyword;
  typeReference?: string;
  array: boolean;
  readonly: boolean;
  optional: boolean;
  options?: LiteralValue[];
  tags?: Record<any, any>;
};

export type TypeInfo = {
  fields?: Record<string, TypeInfoField>;
  tags?: Record<any, any>;
  unionFieldSets?: string[][];
};

export type TypeInfoMap = Record<string, TypeInfo>;
