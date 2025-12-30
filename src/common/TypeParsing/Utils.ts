/**
 * Field-selection helpers for shaping TypeInfo data items.
 */
import { TypeInfo, TypeInfoDataItem } from "./TypeInfo";

/**
 * Remove all fields, from a list of selected fields, that are not in the type info.
 *
 * @typeParam ItemType - Data item shape for field selection.
 * @param typeInfo - Type info describing available fields.
 * @param selectedFields - Fields to filter.
 * @returns Filtered list of selected fields.
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
 *
 * @typeParam ItemType - Data item shape for field selection.
 * @param typeInfo - Type info describing available fields.
 * @param selectedFields - Fields to filter.
 * @returns Filtered list of selected fields.
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
 *
 * @param typeInfo - Type info describing available fields.
 * @param dataItem - Data item to filter.
 * @returns Filtered data item.
 * */
export const removeTypeReferenceFieldsFromDataItem = (
  typeInfo: TypeInfo = {},
  dataItem: Partial<TypeInfoDataItem> = {},
): Partial<TypeInfoDataItem> => {
  const { fields = {} } = typeInfo;
  const cleanItem: Partial<TypeInfoDataItem> = {};

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
 *
 * @param typeInfo - Type info describing available fields.
 * @param dataItem - Data item to filter.
 * @returns Filtered data item.
 * */
export const removeNonexistentFieldsFromDataItem = (
  typeInfo: TypeInfo = {},
  dataItem: Partial<TypeInfoDataItem> = {},
): Partial<TypeInfoDataItem> => {
  const { fields = {} } = typeInfo;
  const cleanItem: Partial<TypeInfoDataItem> = {};

  for (const tIF in dataItem) {
    if (fields[tIF]) {
      cleanItem[tIF] = dataItem[tIF];
    }
  }

  return cleanItem;
};

/**
 * Remove all fields, from a data item, that are not selected.
 *
 * @typeParam ItemType - Data item shape for field selection.
 * @param dataItem - Data item to filter.
 * @param selectedFields - Fields to include.
 * @returns Filtered data item.
 * */
export const removeUnselectedFieldsFromDataItem = <
  ItemType extends TypeInfoDataItem,
>(
  dataItem: Partial<ItemType> = {},
  selectedFields?: (keyof ItemType)[],
): Partial<ItemType> => {
  if (!selectedFields) {
    return dataItem;
  } else {
    const cleanInitialDataItem: Partial<ItemType> =
      typeof dataItem === "object" && dataItem !== null
        ? dataItem
        : ({} as Partial<ItemType>);
    const cleanItem: Partial<ItemType> = {};

    for (const f in cleanInitialDataItem) {
      if (selectedFields.includes(f as keyof ItemType)) {
        cleanItem[f as keyof ItemType] = dataItem[f as keyof ItemType];
      }
    }

    return cleanItem;
  }
};
