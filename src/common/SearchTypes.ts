/**
 * Search-related types used by list/search APIs.
 */
import {
  ItemRelationshipInfo,
  ItemRelationshipOriginItemInfo,
} from "./ItemRelationshipInfoTypes";

/**
 * The logical operators for a search criteria.
 * */
export enum LogicalOperators {
  /**
   * Require all criteria to match.
   * */
  AND = "AND",
  /**
   * Require any criteria to match.
   * */
  OR = "OR",
}

/**
 * The comparison operators for a field criterion.
 * */
export enum ComparisonOperators {
  /**
   * Field value equals the criterion value.
   * */
  EQUALS = "EQUALS",
  /**
   * Field value does not equal the criterion value.
   * */
  NOT_EQUALS = "NOT_EQUALS",
  /**
   * Field value is greater than the criterion value.
   * */
  GREATER_THAN = "GREATER_THAN",
  /**
   * Field value is greater than or equal to the criterion value.
   * */
  GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",
  /**
   * Field value is less than the criterion value.
   * */
  LESS_THAN = "LESS_THAN",
  /**
   * Field value is less than or equal to the criterion value.
   * */
  LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
  /**
   * Field value is in the provided options.
   * */
  IN = "IN",
  /**
   * Field value is not in the provided options.
   * */
  NOT_IN = "NOT_IN",
  /**
   * Field value contains the criterion value as a substring.
   * */
  LIKE = "LIKE",
  /**
   * Field value does not contain the criterion value as a substring.
   * */
  NOT_LIKE = "NOT_LIKE",
  /**
   * Field value exists and is not null.
   * */
  EXISTS = "EXISTS",
  /**
   * Field value is missing or null.
   * */
  NOT_EXISTS = "NOT_EXISTS",
  /**
   * Field value is not empty.
   * */
  IS_NOT_EMPTY = "IS_NOT_EMPTY",
  /**
   * Field value is empty.
   * */
  IS_EMPTY = "IS_EMPTY",
  /**
   * Field value is within an inclusive range.
   * */
  BETWEEN = "BETWEEN",
  /**
   * Field value is outside an inclusive range.
   * */
  NOT_BETWEEN = "NOT_BETWEEN",
  /**
   * Field value array contains the criterion value.
   * */
  CONTAINS = "CONTAINS",
  /**
   * Field value array does not contain the criterion value.
   * */
  NOT_CONTAINS = "NOT_CONTAINS",
  /**
   * Field value starts with the criterion value.
   * */
  STARTS_WITH = "STARTS_WITH",
  /**
   * Field value ends with the criterion value.
   * */
  ENDS_WITH = "ENDS_WITH",
  /**
   * Field value does not start with the criterion value.
   * */
  DOES_NOT_START_WITH = "DOES_NOT_START_WITH",
  /**
   * Field value does not end with the criterion value.
   * */
  DOES_NOT_END_WITH = "DOES_NOT_END_WITH",
}

/**
 * The field criterion for a search criteria.
 * */
export type FieldCriterion = {
  /**
   * Field name to compare.
   * */
  fieldName: string;
  /**
   * Comparison operator to apply.
   * */
  operator?: ComparisonOperators;
  /**
   * Custom operator label when using backend-specific operators.
   * */
  customOperator?: string;
  /**
   * Primary comparison value.
   * */
  value?: any;
  /**
   * Comparison value options (e.g., IN/BETWEEN).
   * */
  valueOptions?: any[];
};

/**
 * The criteria for a search.
 * */
export type SearchCriteria = {
  /**
   * Logical operator to apply across field criteria.
   * */
  logicalOperator: LogicalOperators;
  /**
   * Field-level criteria to evaluate.
   * */
  fieldCriteria: FieldCriterion[];
};

/**
 * The results from a request to list items.
 * */
export type ListItemsResults<ItemType extends Record<any, any>> = {
  /**
   * Cursor for paging into the next page, when available.
   * */
  cursor?: string;
  /**
   * Items returned by the request.
   * */
  items: ItemType[];
};

/**
 * The information used to sort a list of items by a specified field.
 * */
export type SortField = {
  /**
   * Field name to sort by.
   * */
  field?: string;
  /**
   * Whether to reverse sort order.
   * */
  reverse?: boolean;
};

/**
 * The data used to page a specific set of search results that uses full paging.
 * @see SupportedTags.fullPaging
 * */
export type StandardExpandedPagingCursor = {
  /**
   * Current page number.
   * */
  currentPage?: number;
  /**
   * Total number of pages available.
   * */
  totalPages?: number;
};

/**
 * The information for paging through a list of items.
 * */
export type PagingInfo = {
  /**
   * Items per page to request.
   * */
  itemsPerPage?: number;
  /**
   * Cursor token for paging.
   * */
  cursor?: string;
};

/**
 * Configuration for full-text search requests.
 * */
export type TextSearchConfig = {
  /**
   * Text query to search for.
   * */
  query: string;
  /**
   * Index mode to use when searching.
   * */
  mode?: "lossy" | "exact";
  /**
   * Optional index field name.
   * */
  indexField?: string;
};

/**
 * The configuration for listing and searching for items.
 * */
export type ListItemsConfig = PagingInfo & {
  /**
   * Structured search criteria.
   * */
  criteria?: SearchCriteria;
  /**
   * Sort fields to apply.
   * */
  sortFields?: SortField[];
  /**
   * Full-text search configuration.
   * */
  text?: TextSearchConfig;
};

/**
 * A configuration for listing relationships.
 * */
export type ListRelationshipsConfig = PagingInfo & {
  /**
   * Relationship origin info used to filter related records.
   * */
  relationshipItemOrigin: ItemRelationshipOriginItemInfo;
};

/**
 * The results from a request to list relationships.
 * */
export type ListRelationshipsResults = ListItemsResults<ItemRelationshipInfo>;
