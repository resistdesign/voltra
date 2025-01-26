import { TypeInfo, TypeInfoDataItem } from "./TypeInfo";

/**
 * Remove all fields, from a list of selected fields, that are not in the type info.
 * */
export const removeNonexistentFieldsFromSelectedFields = <
  ItemType extends TypeInfoDataItem,
>(
  typeInfo: TypeInfo = {},
  selectedFields?: (keyof ItemType)[],
) => {
  if (Array.isArray(selectedFields)) {
    const { fields = {} } = typeInfo;
    const cleanSelectFields: (keyof ItemType)[] = [];

    for (const tIF in fields) {
      if (selectedFields.includes(tIF as keyof ItemType)) {
        cleanSelectFields.push(tIF as keyof ItemType);
      }
    }

    return cleanSelectFields;
  } else {
    return selectedFields;
  }
};

/**
 * Remove all fields, from a list of selected fields, that are a type reference.
 * */
export const removeTypeReferenceFieldsFromSelectedFields = <ItemType>(
  typeInfo: TypeInfo = {},
  selectedFields?: (keyof ItemType)[],
): (keyof ItemType)[] | undefined => {
  if (Array.isArray(selectedFields)) {
    const { fields = {} } = typeInfo;
    const cleanSelectFields: (keyof ItemType)[] = [];

    for (const tIF in fields) {
      const { typeReference } = fields[tIF];

      if (
        typeof typeReference === "undefined" &&
        selectedFields.includes(tIF as keyof ItemType)
      ) {
        cleanSelectFields.push(tIF as keyof ItemType);
      }
    }

    return cleanSelectFields;
  } else {
    return selectedFields;
  }
};

/**
 * Remove all fields, from a data item, that are a type reference.
 * */
export const removeTypeReferenceFieldsFromDataItem = (
  typeInfo: TypeInfo = {},
  dataItem: TypeInfoDataItem = {},
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

/**
 * Remove all fields, from a data item, that are not in the type info.
 * */
export const removeNonexistentFieldsFromDataItem = (
  typeInfo: TypeInfo = {},
  dataItem: TypeInfoDataItem = {},
): TypeInfoDataItem => {
  const { fields = {} } = typeInfo;
  const cleanItem: TypeInfoDataItem = {};

  for (const tIF in dataItem) {
    if (fields[tIF]) {
      cleanItem[tIF] = dataItem[tIF];
    }
  }

  return cleanItem;
};

/**
 * Remove all fields, from a data item, that are not selected.
 * */
export const removeUnselectedFieldsFromDataItem = <
  ItemType extends TypeInfoDataItem,
>(
  dataItem: ItemType = {} as ItemType,
  selectedFields?: (keyof ItemType)[],
): ItemType => {
  if (!selectedFields) {
    return dataItem;
  } else {
    const cleanInitialDataItem: ItemType =
      typeof dataItem === "object" && dataItem !== null
        ? dataItem
        : ({} as ItemType);
    const cleanItem: ItemType = {} as ItemType;

    for (const f in cleanInitialDataItem) {
      if (selectedFields.includes(f as keyof ItemType)) {
        cleanItem[f as keyof ItemType] = dataItem[f as keyof ItemType];
      }
    }

    return cleanItem;
  }
};
