import { useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
} from "../../../../../../common/TypeParsing/TypeInfo";

export type FieldInfo = {
  typeInfoFields: Record<string, TypeInfoField>;
  fieldNames: string[];
  unhiddenFieldNames: string[];
};

export const useFieldInfo = (typeInfo: TypeInfo): FieldInfo => {
  const typeInfoFields = useMemo<Record<string, TypeInfoField>>(() => {
    const { fields: tIF = {} } = typeInfo;

    return tIF;
  }, [typeInfo]);
  const fieldNames = useMemo<string[]>(
    () => Object.keys(typeInfoFields),
    [typeInfoFields],
  );
  const unhiddenFieldNames = useMemo<string[]>(
    () =>
      fieldNames.filter(
        (fN) => !(typeInfoFields[fN].tags as SupportedFieldTags).hidden,
      ),
    [fieldNames, typeInfoFields],
  );

  return {
    typeInfoFields,
    fieldNames,
    unhiddenFieldNames,
  };
};
