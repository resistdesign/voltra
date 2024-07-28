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
  EXISTS = "EXISTS",
  NOT_EXISTS = "NOT_EXISTS",
  IS_NOT_NULL = "IS_NOT_NULL",
  IS_NULL = "IS_NULL",
  IS_NOT_EMPTY = "IS_NOT_EMPTY",
  IS_EMPTY = "IS_EMPTY",
  BETWEEN = "BETWEEN",
  NOT_BETWEEN = "NOT_BETWEEN",
  CONTAINS = "CONTAINS",
  NOT_CONTAINS = "NOT_CONTAINS",
  STARTS_WITH = "STARTS_WITH",
  ENDS_WITH = "ENDS_WITH",
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
  logicalOperator: LogicalOperators;
  fieldCriteria: (FieldCriterion | SearchCriteria)[];
};
