/**
 * Filtering and sorting utilities for search criteria.
 */
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
  TypeInfoMap,
} from "./TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
  SortField,
} from "./SearchTypes";
import { normalizeIndexText } from "./TextNormalization";

/**
 * Basic comparison operators for filtering data.
 * */
export const COMPARATORS: Record<
  ComparisonOperators,
  (
    /**
     * Criterion value to compare against.
     * */
    criterionValue: any,
    /**
     * Criterion options for operators like IN/BETWEEN.
     * */
    criterionValueOptions: any[] | undefined,
    /**
     * Field value from the item.
     * */
    fieldValue: any,
  ) => boolean
> = {
  [ComparisonOperators.EQUALS]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue === criterionValue,
  [ComparisonOperators.NOT_EQUALS]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue !== criterionValue,
  [ComparisonOperators.GREATER_THAN]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue > criterionValue,
  [ComparisonOperators.GREATER_THAN_OR_EQUAL]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue >= criterionValue,
  [ComparisonOperators.LESS_THAN]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue < criterionValue,
  [ComparisonOperators.LESS_THAN_OR_EQUAL]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue <= criterionValue,
  [ComparisonOperators.IN]: (
    _criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    Array.isArray(criterionValueOptions) &&
    criterionValueOptions.includes(fieldValue),
  [ComparisonOperators.NOT_IN]: (
    _criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    !Array.isArray(criterionValueOptions) ||
    !criterionValueOptions.includes(fieldValue),
  [ComparisonOperators.LIKE]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    normalizeIndexText(fieldValue).includes(normalizeIndexText(criterionValue)),
  [ComparisonOperators.NOT_LIKE]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    !normalizeIndexText(fieldValue).includes(
      normalizeIndexText(criterionValue),
    ),
  [ComparisonOperators.EXISTS]: (
    _criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue !== undefined && fieldValue !== null,
  [ComparisonOperators.NOT_EXISTS]: (
    _criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue === undefined || fieldValue === null,
  [ComparisonOperators.IS_NOT_EMPTY]: (
    _criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "",
  [ComparisonOperators.IS_EMPTY]: (
    _criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => fieldValue === undefined || fieldValue === null || fieldValue === "",
  [ComparisonOperators.BETWEEN]: (
    _criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    Array.isArray(criterionValueOptions) &&
    fieldValue >= criterionValueOptions[0] &&
    fieldValue <= criterionValueOptions[1],
  [ComparisonOperators.NOT_BETWEEN]: (
    _criterionValue: any,
    criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    !Array.isArray(criterionValueOptions) ||
    fieldValue < criterionValueOptions[0] ||
    fieldValue > criterionValueOptions[1],
  [ComparisonOperators.CONTAINS]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => Array.isArray(fieldValue) && fieldValue.includes(criterionValue),
  [ComparisonOperators.NOT_CONTAINS]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !Array.isArray(fieldValue) || !fieldValue.includes(criterionValue),
  [ComparisonOperators.STARTS_WITH]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    normalizeIndexText(fieldValue).startsWith(
      normalizeIndexText(criterionValue),
    ),
  [ComparisonOperators.CASE_INSENSITIVE_EQUALS]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => normalizeIndexText(fieldValue) === normalizeIndexText(criterionValue),
  [ComparisonOperators.CASE_INSENSITIVE_CONTAINS]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    normalizeIndexText(fieldValue).includes(normalizeIndexText(criterionValue)),
  [ComparisonOperators.TEXT_EXACT]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => normalizeIndexText(fieldValue) === normalizeIndexText(criterionValue),
  [ComparisonOperators.TEXT_PHRASE]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    normalizeIndexText(fieldValue).includes(normalizeIndexText(criterionValue)),
  [ComparisonOperators.TEXT_PREFIX]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) =>
    normalizeIndexText(fieldValue).startsWith(
      normalizeIndexText(criterionValue),
    ),
  [ComparisonOperators.TEXT_LOSSY]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => {
    const value = normalizeIndexText(fieldValue);
    return normalizeIndexText(criterionValue)
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => value.includes(token));
  },
  [ComparisonOperators.ENDS_WITH]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => `${fieldValue}`.endsWith(`${criterionValue}`),
  [ComparisonOperators.DOES_NOT_START_WITH]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !`${fieldValue}`.startsWith(`${criterionValue}`),
  [ComparisonOperators.DOES_NOT_END_WITH]: (
    criterionValue: any,
    _criterionValueOptions: any[] | undefined,
    fieldValue: any,
  ) => !`${fieldValue}`.endsWith(`${criterionValue}`),
};

/**
 * Compare a field criterion to a field value.
 *
 * @param fieldCriterion - Criterion to compare.
 * @param fieldValue - Field value to test.
 * @returns Whether the criterion matches the field value.
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
 *
 * @param fieldCriterion - Criterion to compare.
 * @param fieldValue - Array field value to test.
 * @returns Whether the criterion matches the field value array.
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
 * Canonical semantic authority for one item and one public search criteria.
 */
export const doesTypeInfoDataItemMatchSearchCriteria = (
  searchCriteria: SearchCriteria,
  item: TypeInfoDataItem,
  typeInfoName?: string,
  typeInfoMap?: TypeInfoMap,
): boolean => {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const fields = typeInfoMap?.[typeInfoName ?? ""]?.fields ?? {};
  const { logicalOperator, fieldCriteria } = searchCriteria;
  const comparableCriteria = fieldCriteria.filter(
    (criterion) => !fields[criterion.fieldName]?.typeReference,
  );
  const matches = (fieldCriterion: FieldCriterion): boolean => {
    const field = fields[fieldCriterion.fieldName];
    const value = item[fieldCriterion.fieldName];
    return field?.array
      ? compareArray(fieldCriterion, value as any[] | undefined)
      : compare(fieldCriterion, value);
  };
  return logicalOperator === LogicalOperators.OR
    ? comparableCriteria.some(matches)
    : comparableCriteria.every(matches);
};

/**
 * Get the filtered data items based on the search criteria.
 *
 * @param searchCriteria - Criteria to apply.
 * @param items - Items to filter.
 * @param typeInfoName - Optional type name for field metadata.
 * @param typeInfoMap - Optional type info map for field metadata.
 * @returns Filtered items that match the criteria.
 * */
export const getFilterTypeInfoDataItemsBySearchCriteria = (
  searchCriteria: SearchCriteria,
  items: TypeInfoDataItem[],
  typeInfoName?: string,
  typeInfoMap?: TypeInfoMap,
) => {
  return items.filter((item) =>
    doesTypeInfoDataItemMatchSearchCriteria(
      searchCriteria,
      item,
      typeInfoName,
      typeInfoMap,
    ),
  );
};

/**
 * Get the sorted data items based on the given sort fields.
 *
 * @param sortFields - Sort field configuration.
 * @param items - Items to sort.
 * @returns Sorted items array.
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
