import { TypeInfoDataItem } from "../app/components";

export const getSelectedIndices = (
  items: TypeInfoDataItem[],
  selectedItems: TypeInfoDataItem[],
  primaryField: string,
): number[] => {
  const selectedIndices: number[] = [];
  const selectedPrimaryFieldValues = selectedItems.map(
    (selectedItem) => selectedItem[primaryField],
  );

  for (let i = 0; i < items.length; i++) {
    const itemPrimaryFieldValue = items[i][primaryField];

    if (selectedPrimaryFieldValues.includes(itemPrimaryFieldValue)) {
      selectedIndices.push(i);
    }
  }

  return selectedIndices;
};

export const getIndexIsSelected = (
  index: number,
  selectedIndices: number[],
): boolean => selectedIndices.includes(index);

export const getAllItemsAreSelected = (
  items: TypeInfoDataItem[],
  selectedItems: TypeInfoDataItem[],
  primaryField: string,
): boolean => {
  const selectedPrimaryFieldValues = selectedItems.map(
    (selectedItem) => selectedItem[primaryField],
  );

  return items.every((item) =>
    selectedPrimaryFieldValues.includes(item[primaryField]),
  );
};

export const getSomeItemsAreSelected = (
  items: TypeInfoDataItem[],
  selectedItems: TypeInfoDataItem[],
  primaryField: string,
): boolean => {
  const selectedPrimaryFieldValues = selectedItems.map(
    (selectedItem) => selectedItem[primaryField],
  );

  return items.some((item) =>
    selectedPrimaryFieldValues.includes(item[primaryField]),
  );
};
