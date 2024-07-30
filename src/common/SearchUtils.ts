import { TypeInfoField, TypeInfoMap } from "./TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  LogicalOperators,
  SearchCriteria,
} from "./SearchTypes";
import { TypeInfoDataItem } from "../app/components";

/**
 * Basic comparison operators for filtering data.
 * */
export const COMPARATORS: Record<
  ComparisonOperators,
  (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => boolean
> = {
  [ComparisonOperators.EQUALS]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue === criterionValue,
  [ComparisonOperators.NOT_EQUALS]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue !== criterionValue,
  [ComparisonOperators.GREATER_THAN]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue > criterionValue,
  [ComparisonOperators.GREATER_THAN_OR_EQUAL]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue >= criterionValue,
  [ComparisonOperators.LESS_THAN]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue < criterionValue,
  [ComparisonOperators.LESS_THAN_OR_EQUAL]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue <= criterionValue,
  [ComparisonOperators.IN]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) =>
    Array.isArray(criterionValueOptions) &&
    criterionValueOptions.includes(fieldValue),
  [ComparisonOperators.NOT_IN]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) =>
    !Array.isArray(criterionValueOptions) ||
    !criterionValueOptions.includes(fieldValue),
  [ComparisonOperators.LIKE]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => `${fieldValue}`.includes(`${criterionValue}`),
  [ComparisonOperators.NOT_LIKE]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => !`${fieldValue}`.includes(`${criterionValue}`),
  [ComparisonOperators.EXISTS]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue !== undefined && fieldValue !== null,
  [ComparisonOperators.NOT_EXISTS]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue === undefined || fieldValue === null,
  [ComparisonOperators.IS_NOT_EMPTY]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "",
  [ComparisonOperators.IS_EMPTY]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => fieldValue === undefined || fieldValue === null || fieldValue === "",
  [ComparisonOperators.BETWEEN]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) =>
    Array.isArray(criterionValueOptions) &&
    fieldValue >= criterionValueOptions[0] &&
    fieldValue <= criterionValueOptions[1],
  [ComparisonOperators.NOT_BETWEEN]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) =>
    !Array.isArray(criterionValueOptions) ||
    fieldValue < criterionValueOptions[0] ||
    fieldValue > criterionValueOptions[1],
  [ComparisonOperators.CONTAINS]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => Array.isArray(fieldValue) && fieldValue.includes(criterionValue),
  [ComparisonOperators.NOT_CONTAINS]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => !Array.isArray(fieldValue) || !fieldValue.includes(criterionValue),
  [ComparisonOperators.STARTS_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => `${fieldValue}`.startsWith(`${criterionValue}`),
  [ComparisonOperators.ENDS_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => `${fieldValue}`.endsWith(`${criterionValue}`),
  [ComparisonOperators.DOES_NOT_START_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => !`${fieldValue}`.startsWith(`${criterionValue}`),
  [ComparisonOperators.DOES_NOT_END_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[],
    fieldValue: any,
  ) => !`${fieldValue}`.endsWith(`${criterionValue}`),
};

/**
 * Get the filtered data items based on the search criteria.
 * */
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
