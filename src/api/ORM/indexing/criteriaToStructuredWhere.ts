/**
 * @packageDocumentation
 *
 * Map {@link SearchCriteria} to structured-index {@link Where} clauses.
 * Unsupported operators throw {@link TypeInfoORMServiceError}.
 */
import {
  ComparisonOperators,
  FieldCriterion,
  LogicalOperators,
  SearchCriteria,
} from "../../../common/SearchTypes";
import type { Where } from "../../Indexing/structured/types";
import { TypeInfoORMServiceError } from "../../../common/TypeInfoORM";

const resolveBetweenBounds = (criterion: FieldCriterion): [unknown, unknown] => {
  const { value, valueOptions } = criterion;
  if (Array.isArray(valueOptions) && valueOptions.length === 2) {
    return [valueOptions[0], valueOptions[1]];
  }

  if (Array.isArray(value) && value.length === 2) {
    return [value[0], value[1]];
  }

  throw {
    message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
    operator: ComparisonOperators.BETWEEN,
    fieldName: criterion.fieldName,
  };
};

const buildTerm = (
  fieldName: string,
  mode: "eq" | "contains",
  value: unknown,
): Where => ({
  type: "term",
  field: fieldName,
  mode,
  value: value as any,
});

const buildWhereForCriterion = (criterion: FieldCriterion): Where => {
  const { fieldName, operator = ComparisonOperators.EQUALS, value } = criterion;

  switch (operator) {
    case ComparisonOperators.EQUALS:
      return buildTerm(fieldName, "eq", value);
    case ComparisonOperators.CONTAINS:
    case ComparisonOperators.LIKE:
      return buildTerm(fieldName, "contains", value);
    case ComparisonOperators.GREATER_THAN_OR_EQUAL:
      return { type: "gte", field: fieldName, value: value as any };
    case ComparisonOperators.LESS_THAN_OR_EQUAL:
      return { type: "lte", field: fieldName, value: value as any };
    case ComparisonOperators.BETWEEN: {
      const [lower, upper] = resolveBetweenBounds(criterion);
      return { type: "between", field: fieldName, lower: lower as any, upper: upper as any };
    }
    case ComparisonOperators.IN: {
      const values = Array.isArray(criterion.valueOptions)
        ? criterion.valueOptions
        : Array.isArray(value)
          ? value
          : undefined;

      if (!values || values.length === 0) {
        throw {
          message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
          operator,
          fieldName,
        };
      }

      return {
        or: values.map((entry) => buildTerm(fieldName, "eq", entry)),
      };
    }
    default:
      throw {
        message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
        operator,
        fieldName,
      };
  }
};

/**
 * Translate {@link SearchCriteria.fieldCriteria} into a structured WHERE tree.
 */
export const criteriaToStructuredWhere = (
  criteria?: SearchCriteria,
): Where | undefined => {
  if (!criteria || !Array.isArray(criteria.fieldCriteria)) {
    return undefined;
  }

  const clauses = criteria.fieldCriteria.map((criterion) =>
    buildWhereForCriterion(criterion),
  );

  if (clauses.length === 0) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return criteria.logicalOperator === LogicalOperators.OR
    ? { or: clauses }
    : { and: clauses };
};
