import { TypeInfo, TypeInfoField, TypeInfoMap } from "./TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  FieldCriterion,
  LogicalOperators,
  SearchCriteria, SortField,
} from "./SearchTypes";
import { TypeInfoDataItem } from "../app/components";

/**
 * Basic comparison operators for filtering data.
 * */
export const COMPARATORS: Record<
  ComparisonOperators,
  (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => boolean
> = {
  [ComparisonOperators.EQUALS]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue === criterionValue,
  [ComparisonOperators.NOT_EQUALS]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue !== criterionValue,
  [ComparisonOperators.GREATER_THAN]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue > criterionValue,
  [ComparisonOperators.GREATER_THAN_OR_EQUAL]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue >= criterionValue,
  [ComparisonOperators.LESS_THAN]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue < criterionValue,
  [ComparisonOperators.LESS_THAN_OR_EQUAL]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue <= criterionValue,
  [ComparisonOperators.IN]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    Array.isArray(criterionValueOptions) &&
    criterionValueOptions.includes(fieldValue),
  [ComparisonOperators.NOT_IN]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    !Array.isArray(criterionValueOptions) ||
    !criterionValueOptions.includes(fieldValue),
  [ComparisonOperators.LIKE]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => `${fieldValue}`.includes(`${criterionValue}`),
  [ComparisonOperators.NOT_LIKE]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !`${fieldValue}`.includes(`${criterionValue}`),
  [ComparisonOperators.EXISTS]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue !== undefined && fieldValue !== null,
  [ComparisonOperators.NOT_EXISTS]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue === undefined || fieldValue === null,
  [ComparisonOperators.IS_NOT_EMPTY]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "",
  [ComparisonOperators.IS_EMPTY]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue === undefined || fieldValue === null || fieldValue === "",
  [ComparisonOperators.BETWEEN]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    Array.isArray(criterionValueOptions) &&
    fieldValue >= criterionValueOptions[0] &&
    fieldValue <= criterionValueOptions[1],
  [ComparisonOperators.NOT_BETWEEN]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    !Array.isArray(criterionValueOptions) ||
    fieldValue < criterionValueOptions[0] ||
    fieldValue > criterionValueOptions[1],
  [ComparisonOperators.CONTAINS]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => Array.isArray(fieldValue) && fieldValue.includes(criterionValue),
  [ComparisonOperators.NOT_CONTAINS]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !Array.isArray(fieldValue) || !fieldValue.includes(criterionValue),
  [ComparisonOperators.STARTS_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => `${fieldValue}`.startsWith(`${criterionValue}`),
  [ComparisonOperators.ENDS_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => `${fieldValue}`.endsWith(`${criterionValue}`),
  [ComparisonOperators.DOES_NOT_START_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !`${fieldValue}`.startsWith(`${criterionValue}`),
  [ComparisonOperators.DOES_NOT_END_WITH]: (
    criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !`${fieldValue}`.endsWith(`${criterionValue}`),
};

/**
 * Compare a field criterion to a field value.
 * */
export const compare = (
  fieldCriterion: FieldCriterion,
  fieldValue: any,
): boolean => {
  const {
    operator,
    value: criterionValue,
    valueOptions: criterionValueOptions,
  } = fieldCriterion;
  const comparator = operator ? COMPARATORS[operator] : undefined;

  if (comparator) {
    return comparator(criterionValue, criterionValueOptions, fieldValue);
  } else {
    return false;
  }
};

/**
 * Compare a field criterion to an array of field values.
 * */
export const compareArray = (
  fieldCriterion: FieldCriterion,
  fieldValue: any[] | undefined,
) => {
  if (Array.isArray(fieldValue)) {
    const { operator } = fieldCriterion;
    const isArrayOperator =
      operator === ComparisonOperators.CONTAINS ||
      operator === ComparisonOperators.NOT_CONTAINS;

    return isArrayOperator
      ? compare(fieldCriterion, fieldValue)
      : fieldValue.some((value) => compare(fieldCriterion, value));
  } else {
    return false;
  }
};

/**
 * Get the filtered data items based on the search criteria.
 * */
export const getFilterTypeInfoDataItemsBySearchCriteria = (
  searchCriteria: SearchCriteria,
  items: TypeInfoDataItem[],
  typeInfoName?: string,
  typeInfoMap?: TypeInfoMap,
) => {
  const { fields = {} }: Partial<TypeInfo> =
    typeInfoMap?.[typeInfoName as keyof TypeInfoMap] || {};
  const { logicalOperator = LogicalOperators.AND, fieldCriteria = [] } =
    searchCriteria;
  const filteredItems: TypeInfoDataItem[] = [];

  for (const currentItem of items) {
    if (typeof currentItem === "object" && currentItem !== null) {
      let meetsCriteria = true;

      for (const fieldCriterion of fieldCriteria) {
        const { fieldName } = fieldCriterion;
        const { array: isArrayType, typeReference }: Partial<TypeInfoField> =
          fields[fieldName] || {};
        const currentFieldValue = currentItem[fieldName];

        if (!typeReference) {
          const result = isArrayType
            ? compareArray(
                fieldCriterion,
                currentFieldValue as any[] | undefined,
              )
            : compare(fieldCriterion, currentFieldValue);

          if (logicalOperator === LogicalOperators.AND) {
            meetsCriteria = result;

            if (!meetsCriteria) {
              break;
            }
          } else {
            meetsCriteria = meetsCriteria || result;

            if (meetsCriteria) {
              break;
            }
          }
        }
      }

      if (meetsCriteria) {
        filteredItems.push(currentItem);
      }
    }
  }

  return filteredItems;
};

/**
 * Get the sorted data items based on the given sort fields.
 * */
export const getSortedItems = (
  sortFields: SortField[] = [],
  items: TypeInfoDataItem[] = [],
): TypeInfoDataItem[] => {
  let newItems = [...items];

  if (sortFields.length > 0) {
    for (const sortF of sortFields) {
      const { field, reverse } = sortF;

      newItems = newItems.sort((a, b) => {
        const aValue: any = a[field as keyof TypeInfoDataItem];
        const bValue: any = b[field as keyof TypeInfoDataItem];

        if (aValue < bValue) {
          return reverse ? 1 : -1;
        } else if (aValue > bValue) {
          return reverse ? -1 : 1;
        } else {
          return 0;
        }
      });
    }
  }

  return newItems;
};
