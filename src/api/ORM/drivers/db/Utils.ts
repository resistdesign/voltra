import { TypeInfoDataItem } from "../../../../common/TypeParsing/TypeInfo";

/**
 * Get a data item with only the selected fields.
 * */
export const getDataItemWithOnlySelectedFields = (
  dataItem: TypeInfoDataItem = {},
  selectedFields?: string[],
): TypeInfoDataItem => {
  if (typeof selectedFields !== "undefined") {
    const cleanItem: TypeInfoDataItem = {};

    for (const sF of selectedFields) {
      if (typeof dataItem[sF] !== "undefined") {
        cleanItem[sF] = dataItem[sF];
      }
    }

    return cleanItem;
  } else {
    return dataItem;
  }
};
