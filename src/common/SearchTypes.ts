import { ItemRelationshipOriginItemInfo } from "./ItemRelationshipInfo";

/**
 * The logical operators for a search criteria.
 * */
export enum LogicalOperators {
  AND = "AND",
  OR = "OR",
}

/**
 * The comparison operators for a field criterion.
 * */
export enum ComparisonOperators {
  EQUALS = "EQUALS",
  NOT_EQUALS = "NOT_EQUALS",
  GREATER_THAN = "GREATER_THAN",
  GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",
  LESS_THAN = "LESS_THAN",
  LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
  IN = "IN",
  NOT_IN = "NOT_IN",
  LIKE = "LIKE",
  NOT_LIKE = "NOT_LIKE",
  EXISTS = "EXISTS",
  NOT_EXISTS = "NOT_EXISTS",
  IS_NOT_EMPTY = "IS_NOT_EMPTY",
  IS_EMPTY = "IS_EMPTY",
  BETWEEN = "BETWEEN",
  NOT_BETWEEN = "NOT_BETWEEN",
  CONTAINS = "CONTAINS",
  NOT_CONTAINS = "NOT_CONTAINS",
  STARTS_WITH = "STARTS_WITH",
  ENDS_WITH = "ENDS_WITH",
  DOES_NOT_START_WITH = "DOES_NOT_START_WITH",
  DOES_NOT_END_WITH = "DOES_NOT_END_WITH",
}

/**
 * The field criterion for a search criteria.
 * */
export type FieldCriterion = {
  fieldName: string;
  operator?: ComparisonOperators;
  customOperator?: string;
  value?: any;
  valueOptions?: any[];
};

/**
 * The criteria for a search.
 * */
export type SearchCriteria = {
  logicalOperator: LogicalOperators;
  fieldCriteria: FieldCriterion[];
};

/**
 * The results from a request to list items.
 * */
export type ListItemResults<ItemType extends Record<any, any>> = {
  cursor?: string;
  items: ItemType[];
};

/**
 * The information used to sort a list of items by a specified field.
 * */
export type SortField = {
  field?: string;
  reverse?: boolean;
};

/**
 * The information for paging through a list of items.
 * */
export type PagingInfo = {
  itemsPerPage?: number;
  cursor?: string;
};

/**
 * The information for checking the existence of items.
 * */
export type ItemsExistenceInfo = {
  checkExistence?: boolean | undefined;
};

/**
 * The configuration for listing and searching for items.
 * */
export type ListItemsConfig = PagingInfo &
  ItemsExistenceInfo & {
    criteria?: SearchCriteria;
    sortFields?: SortField[];
  };

/**
 * A configuration for listing relationships.
 * */
export type ListRelationshipsConfig = PagingInfo &
  ItemsExistenceInfo & {
    relationshipItemOrigin: ItemRelationshipOriginItemInfo;
  };
