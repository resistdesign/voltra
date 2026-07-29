/**
 * @packageDocumentation
 *
 * Deterministically compile public semantic criteria into one indexed
 * expression tree. Unsupported capabilities fail explicitly.
 */
import {
  ComparisonOperators,
  type FieldCriterion,
  LogicalOperators,
  type SearchCriteria,
} from "../../../common/SearchTypes";
import { TypeInfoORMServiceError } from "../../../common/TypeInfoORM";
import { qualifyIndexField } from "../../Indexing/fieldQualification";
import {
  stableStringify,
  type IndexedFieldCapabilities,
  type IndexExpression,
  type IndexQueryValue,
  type TextMatchMode,
} from "../../Indexing/query";

const unsupported = (criterion: FieldCriterion): never => {
  throw {
    message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
    operator: criterion.operator,
    fieldName: criterion.fieldName,
  };
};

const scalar = (value: unknown, criterion: FieldCriterion): IndexQueryValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return unsupported(criterion);
};

const textModeFor = (
  operator: ComparisonOperators,
): TextMatchMode | undefined => {
  switch (operator) {
    case ComparisonOperators.LIKE:
    case ComparisonOperators.CASE_INSENSITIVE_CONTAINS:
      return "caseInsensitiveContains";
    case ComparisonOperators.CASE_INSENSITIVE_EQUALS:
      return "caseInsensitiveEquals";
    case ComparisonOperators.TEXT_EXACT:
      return "exact";
    case ComparisonOperators.TEXT_PHRASE:
      return "phrase";
    case ComparisonOperators.STARTS_WITH:
    case ComparisonOperators.TEXT_PREFIX:
      return "prefix";
    case ComparisonOperators.TEXT_LOSSY:
      return "lossy";
    default:
      return undefined;
  }
};

const compileCriterion = (
  typeName: string,
  criterion: FieldCriterion,
  capabilities: Record<string, IndexedFieldCapabilities>,
): IndexExpression => {
  const capability = capabilities[criterion.fieldName];
  if (!capability) {
    return unsupported(criterion);
  }
  const field = qualifyIndexField(
    typeName,
    capability.field ?? criterion.fieldName,
  );
  const operator = criterion.operator ?? ComparisonOperators.EQUALS;
  const textMode = textModeFor(operator);
  if (textMode) {
    if (!capability.text?.[textMode] || typeof criterion.value !== "string") {
      return unsupported(criterion);
    }
    const query = criterion.value.trim();
    if (!query) {
      return unsupported(criterion);
    }
    return { type: "text", field, mode: textMode, query };
  }

  switch (operator) {
    case ComparisonOperators.EQUALS:
      if (!capability.exact) return unsupported(criterion);
      return {
        type: "term",
        field,
        mode: "eq",
        value: scalar(criterion.value, criterion),
      };
    case ComparisonOperators.CONTAINS:
      if (!capability.membership) return unsupported(criterion);
      return {
        type: "term",
        field,
        mode: "contains",
        value: scalar(criterion.value, criterion),
      };
    case ComparisonOperators.IN: {
      if (!capability.exact || !Array.isArray(criterion.valueOptions)) {
        return unsupported(criterion);
      }
      const values = criterion.valueOptions.map((value) =>
        scalar(value, criterion),
      );
      if (!values.length) return unsupported(criterion);
      return {
        or: values.map((value) => ({
          type: "term" as const,
          field,
          mode: "eq" as const,
          value,
        })),
      };
    }
    case ComparisonOperators.GREATER_THAN_OR_EQUAL:
    case ComparisonOperators.LESS_THAN_OR_EQUAL:
      if (!capability.range) return unsupported(criterion);
      return {
        type:
          operator === ComparisonOperators.GREATER_THAN_OR_EQUAL
            ? "gte"
            : "lte",
        field,
        value: scalar(criterion.value, criterion),
      };
    case ComparisonOperators.BETWEEN:
      if (
        !capability.range ||
        !Array.isArray(criterion.valueOptions) ||
        criterion.valueOptions.length !== 2
      ) {
        return unsupported(criterion);
      }
      return {
        type: "between",
        field,
        lower: scalar(criterion.valueOptions[0], criterion),
        upper: scalar(criterion.valueOptions[1], criterion),
      };
    default:
      return unsupported(criterion);
  }
};

const normalizedChildren = (children: IndexExpression[]): IndexExpression[] =>
  [...children].sort((left, right) =>
    stableStringify(left).localeCompare(stableStringify(right)),
  );

/**
 * Compile all criteria using the TypeInfo-derived field capability registry.
 */
export const criteriaToIndexExpression = (
  typeName: string,
  criteria: SearchCriteria | undefined,
  capabilities: Record<string, IndexedFieldCapabilities> | undefined,
): IndexExpression | undefined => {
  if (!criteria?.fieldCriteria?.length) {
    return undefined;
  }
  const children = normalizedChildren(
    criteria.fieldCriteria.map((criterion) =>
      compileCriterion(typeName, criterion, capabilities ?? {}),
    ),
  );
  if (children.length === 1) {
    return children[0];
  }
  return criteria.logicalOperator === LogicalOperators.OR
    ? { or: children }
    : { and: children };
};
