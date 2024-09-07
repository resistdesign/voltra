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
