/**
 * The possible types of criteria for a search or report query.
 * */
export enum SearchCriterionTypes {
  CRITERION = "CRITERION",
  NESTED_CRITERION = "NESTED_CRITERION",
  CRITERION_GROUP = "CRITERION_GROUP",
  BOOLEAN_CRITERION = "BOOLEAN_CRITERION",
}

/**
 * The possible logical groupings for a set of criteria.
 * */
export enum SearchCriterionLogicalGroupingTypes {
  AND = "AND",
  OR = "OR",
}

/**
 * The possible operators for a search criterion.
 * */
export enum SearchOperatorTypes {
  EQUAL = "EQUAL",
  NOT_EQUAL = "NOT_EQUAL",
  GREATER_THAN = "GREATER_THAN",
  GREATER_THAN_OR_EQUAL = "GREATER_THAN_OR_EQUAL",
  LESS_THAN = "LESS_THAN",
  LESS_THAN_OR_EQUAL = "LESS_THAN_OR_EQUAL",
  IN = "IN",
  NOT_IN = "NOT_IN",
  CONTAINS = "CONTAINS",
  NOT_CONTAINS = "NOT_CONTAINS",
  STARTS_WITH = "STARTS_WITH",
  ENDS_WITH = "ENDS_WITH",
  IS_NULL = "IS_NULL",
  IS_NOT_NULL = "IS_NOT_NULL",
  IS_EMPTY = "IS_EMPTY",
  IS_NOT_EMPTY = "IS_NOT_EMPTY",
  BETWEEN = "BETWEEN",
  NOT_BETWEEN = "NOT_BETWEEN",
  EXISTS = "EXISTS",
  NOT_EXISTS = "NOT_EXISTS",
}

/**
 * A generic type specifier for a criterion.
 * */
export type CriterionTypeSpecifier<SpecificType extends SearchCriterionTypes> =
  {
    type: SpecificType;
  };

/**
 * A boolean criterion. (`true` or `false`)
 * */
export type BooleanCriterion =
  CriterionTypeSpecifier<SearchCriterionTypes.BOOLEAN_CRITERION> & {
    value: boolean;
  };

/**
 * A nested criterion path.
 * */
export type CriterionPath =
  CriterionTypeSpecifier<SearchCriterionTypes.NESTED_CRITERION> & {
    field: string;
    value: Criteria;
  };

/**
 * A single criterion for a search or report query.
 * */
export type Criterion =
  CriterionTypeSpecifier<SearchCriterionTypes.CRITERION> & {
    field: string;
    operator: SearchOperatorTypes;
    value: any;
  };

/**
 * Either a criterion or a nested criterion path.
 * */
export type CriterionVariation = CriterionPath | Criterion;

/**
 * An AND or OR grouping of criteria.
 * */
export type CriterionGroup =
  CriterionTypeSpecifier<SearchCriterionTypes.CRITERION_GROUP> & {
    logicalGroupingType: SearchCriterionLogicalGroupingTypes;
    criteria: Criteria[];
  };

/**
 * A universal type to describe the criteria for a search or report query.
 * */
export type Criteria = CriterionVariation | CriterionGroup | BooleanCriterion;
