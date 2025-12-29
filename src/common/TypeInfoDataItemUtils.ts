/**
 * @packageDocumentation
 *
 * Helpers for deriving default values from TypeInfo field constraints.
 */
import {
  LiteralValue,
  TypeInfoField,
  TypeKeyword,
} from "./TypeParsing/TypeInfo";

export type FieldValueType = LiteralValue | LiteralValue[];

type DefaultValueConverter = (value: string) => string | number | boolean;

const FIELD_VALUE_CONVERTER_MAP: Record<TypeKeyword, DefaultValueConverter> = {
  string: (value: string): string => `${value}`,
  number: (value: string): number => {
    let num = 0;

    try {
      num = parseFloat(value);
    } catch (error) {
      // Ignore.
    }

    return isNaN(num) ? 0 : num;
  },
  boolean: (value: string): boolean => !!value && value === "true",
};

const ARRAY_CONVERTER = (
  value: string,
  subConverter: DefaultValueConverter,
): LiteralValue[] => {
  let arr: LiteralValue[] = [];

  try {
    const interimArr: unknown = JSON.parse(value);

    if (Array.isArray(interimArr)) {
      arr = interimArr.map((x) => subConverter(`${x}`));
    }
  } catch (error) {
    // Ignore.
  }

  return arr;
};

export type DefaultValueInfo =
  | {
      hasDefaultValue: true;
      defaultValue: FieldValueType;
    }
  | {
      hasDefaultValue: false;
      defaultValue: undefined;
    };

export const getDefaultValueInfo = (
  typeInfoField: TypeInfoField,
): DefaultValueInfo => {
  const {
    type,
    array = false,
    typeReference,
    tags: { constraints = {} } = {},
  } = typeInfoField;

  let info: DefaultValueInfo = {
    hasDefaultValue: false,
    defaultValue: undefined,
  };

  if (!typeReference && constraints && "defaultValue" in constraints) {
    const { defaultValue } = constraints;
    const fieldType = type as unknown;
    const converter =
      typeof fieldType === "string" && fieldType in FIELD_VALUE_CONVERTER_MAP
        ? FIELD_VALUE_CONVERTER_MAP[fieldType as TypeKeyword]
        : undefined;
    const cleanDefaultValue =
      converter && typeof defaultValue === "string"
        ? array
          ? ARRAY_CONVERTER(defaultValue, converter)
          : converter(defaultValue)
        : defaultValue;

    info = {
      hasDefaultValue: true,
      defaultValue: cleanDefaultValue,
    };
  }

  return info;
};
