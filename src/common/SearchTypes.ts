export enum LogicalOperators {
  AND = "AND",
  OR = "OR",
}

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
  IS_NULL = "IS_NULL",
  IS_NOT_NULL = "IS_NOT_NULL",
  BETWEEN = "BETWEEN",
  NOT_BETWEEN = "NOT_BETWEEN",
  CONTAINS = "CONTAINS",
  NOT_CONTAINS = "NOT_CONTAINS",
}

export type FieldCriterion = {
  fieldName: string;
  operator: ComparisonOperators;
  customOperator?: string;
  value?: any;
  subSearchCriteria?: SearchCriteria;
};

export type SearchCriteria = {
  isSearchCriteria: true;
  pageData?: any;
  itemType: string;
  logicalOperator: LogicalOperators;
  fieldCriteria: (FieldCriterion | SearchCriteria)[];
};
