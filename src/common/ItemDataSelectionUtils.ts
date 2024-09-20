import { TypeInfoDataItem } from "../app/components";
import { MultiRelationshipCheckResultsMap } from "./SearchTypes";

export const getSelectedIndices = (
  items: TypeInfoDataItem[],
  relationshipCheckResults: MultiRelationshipCheckResultsMap,
  primaryField: string,
): number[] => {
  const selectedIndices: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const itemPrimaryFieldValue = items[i][primaryField];

    if (
      itemPrimaryFieldValue &&
      relationshipCheckResults[itemPrimaryFieldValue as string]
    ) {
      selectedIndices.push(i);
    }
  }

  return selectedIndices;
};
