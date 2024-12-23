import { TypeInfo, TypeInfoDataItem } from "./TypeInfo";

/**
 * Remove all fields from a data item that are a type reference.
 * */
export const removeTypeReferenceFieldsFromDataItem = (
  dataItem: TypeInfoDataItem = {},
  typeInfo: TypeInfo = {},
): TypeInfoDataItem => {
  const { fields = {} } = typeInfo;
  const cleanItem: TypeInfoDataItem = {};

  for (const tIF in fields) {
    const { typeReference } = fields[tIF];

    if (
      typeof typeReference === "undefined" &&
      typeof dataItem[tIF] !== "undefined"
    ) {
      cleanItem[tIF] = dataItem[tIF];
    }
  }

  return cleanItem;
};
