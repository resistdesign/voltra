import { TypeInfoField, TypeInfoMap } from "./TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
} from "./SearchTypes";
import { TypeInfoDataItem } from "../app/components";

export const COMPARATORS: Record<
  ComparisonOperators,
  (searchFieldCriterion: FieldCriterion, value: any) => boolean
> = {
  [ComparisonOperators.EQUALS]: () => {},
  [ComparisonOperators.NOT_EQUALS]: () => {},
  [ComparisonOperators.GREATER_THAN]: () => {},
  [ComparisonOperators.GREATER_THAN_OR_EQUAL]: () => {},
  [ComparisonOperators.LESS_THAN]: () => {},
  [ComparisonOperators.LESS_THAN_OR_EQUAL]: () => {},
  [ComparisonOperators.IN]: () => {},
  [ComparisonOperators.NOT_IN]: () => {},
  [ComparisonOperators.LIKE]: () => {},
  [ComparisonOperators.NOT_LIKE]: () => {},
  [ComparisonOperators.EXISTS]: () => {},
  [ComparisonOperators.NOT_EXISTS]: () => {},
  [ComparisonOperators.IS_NOT_NULL]: () => {},
  [ComparisonOperators.IS_NULL]: () => {},
  [ComparisonOperators.IS_NOT_EMPTY]: () => {},
  [ComparisonOperators.IS_EMPTY]: () => {},
  [ComparisonOperators.BETWEEN]: () => {},
  [ComparisonOperators.NOT_BETWEEN]: () => {},
  [ComparisonOperators.CONTAINS]: () => {},
  [ComparisonOperators.NOT_CONTAINS]: () => {},
  [ComparisonOperators.STARTS_WITH]: () => {},
  [ComparisonOperators.ENDS_WITH]: () => {},
};

export const getFilterTypeInfoDataItemsBySearchCriteria = (
  typeInfoName: string,
  typeInfoMap: TypeInfoMap,
  searchCriteria: SearchCriteria,
  items: TypeInfoDataItem[],
) => {
  const { fields = {} } = typeInfoMap[typeInfoName];
  const { logicalOperator = LogicalOperators.AND, fieldCriteria = [] } =
    searchCriteria;
  const filteredItems: TypeInfoDataItem[] = [];

  for (const currentItem of items) {
    if (typeof currentItem === "object" && currentItem !== null) {
      let meetsCriteria = true;

      for (const fieldCriterion of fieldCriteria) {
        const { fieldName, operator, value } = fieldCriterion;
        const { type, array, typeReference }: TypeInfoField = fields[fieldName];
        const currentItemValue = currentItem[fieldName];

        if (!typeReference) {
        }
      }

      if (meetsCriteria) {
        filteredItems.push(currentItem);
      }
    }
  }

  return filteredItems;
};
