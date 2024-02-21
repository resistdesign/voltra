import {
  BooleanCriterion,
  Criteria,
  CriterionGroup,
  CriterionPath,
  SearchCriterionLogicalGroupingTypes,
  SearchCriterionTypes,
} from "../SearchCriteriaTypes";
import {
  DataContext,
  DataContextField,
  DataContextItemType,
  DataContextMap,
  dataContextOperationIsAllowed,
  DataContextOperationOptions,
} from "../DataContextService";

type CriteriaReducer = (criteria: Criteria) => Criteria;

const CRITERIA_REDUCER_MAP: Record<SearchCriterionTypes, CriteriaReducer> = {
  [SearchCriterionTypes.CRITERION]: (criteria: Criteria): Criteria => criteria,
  [SearchCriterionTypes.NESTED_CRITERION]: (criteria: Criteria): Criteria => {
    const { value } = criteria as CriterionPath;

    return {
      ...criteria,
      value: reduceCriteria(value),
    } as CriterionPath;
  },
  [SearchCriterionTypes.CRITERION_GROUP]: (criteria: Criteria): Criteria => {
    const { logicalGroupingType, criteria: groupCriteria = [] } =
      criteria as CriterionGroup;
    const newGroupCriteria = groupCriteria.map(reduceCriteria);
    const allAreBoolean = newGroupCriteria.every(
      ({ type }) => type === SearchCriterionTypes.BOOLEAN_CRITERION
    );

    if (allAreBoolean) {
      const boolList = (newGroupCriteria as BooleanCriterion[]).map(
        ({ value }) => value
      );

      if (logicalGroupingType === SearchCriterionLogicalGroupingTypes.OR) {
        return {
          type: SearchCriterionTypes.BOOLEAN_CRITERION,
          value: boolList.some((bool) => bool),
        } as BooleanCriterion;
      }

      if (logicalGroupingType === SearchCriterionLogicalGroupingTypes.AND) {
        return {
          type: SearchCriterionTypes.BOOLEAN_CRITERION,
          value: boolList.every((bool) => bool),
        } as BooleanCriterion;
      }
    }

    for (const nGC of newGroupCriteria) {
      const { type: nGCType } = nGC;

      if (nGCType === SearchCriterionTypes.BOOLEAN_CRITERION) {
        const { value: nGCValue } = nGC as BooleanCriterion;

        if (
          logicalGroupingType === SearchCriterionLogicalGroupingTypes.OR &&
          nGCValue
        ) {
          return nGC;
        }

        if (
          logicalGroupingType === SearchCriterionLogicalGroupingTypes.AND &&
          !nGCValue
        ) {
          return nGC;
        }
      }
    }

    return {
      ...criteria,
      criteria: newGroupCriteria,
    } as CriterionGroup;
  },
  [SearchCriterionTypes.BOOLEAN_CRITERION]: (criteria: Criteria): Criteria =>
    criteria,
};

export const reduceCriteria = (criteria: Criteria): Criteria => {
  const { type } = criteria;
  const criteriaReducer = CRITERIA_REDUCER_MAP[type];

  return criteriaReducer(criteria);
};

export const flattenCriterionGroups = (
  criteria: Criteria | undefined
): Criteria[] => {
  if (!criteria) {
    return [];
  } else {
    const { type } = criteria;

    if (type === SearchCriterionTypes.CRITERION_GROUP) {
      const { criteria: criteriaList = [] } = criteria;

      let flattenedCriteriaList: Criteria[] = [];

      for (const criterion of criteriaList) {
        if (criterion.type === SearchCriterionTypes.CRITERION_GROUP) {
          flattenedCriteriaList = [...flattenCriterionGroups(criterion)];
        } else {
          flattenedCriteriaList = [...flattenedCriteriaList, criterion];
        }
      }

      return flattenedCriteriaList;
    } else {
      return [criteria];
    }
  }
};

export const criteriaListHasRelatedField = <
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType
>(
  criteriaList: Criteria[],
  dataContext: DataContext<ItemType, UniquelyIdentifyingFieldName>
): boolean => {
  const { fields } = dataContext;

  for (const criterion of criteriaList) {
    const { type } = criterion;

    if (
      type === SearchCriterionTypes.CRITERION ||
      type === SearchCriterionTypes.NESTED_CRITERION
    ) {
      const { field } = criterion;
      const { isContext = false, embedded = false }: Partial<DataContextField> =
        fields[field] || {};
      const isRelatedField = isContext && !embedded;

      if (isRelatedField) {
        return true;
      }
    }
  }

  return false;
};

export const criteriaListHasDisallowedFieldForOperation = <
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType
>(
  criteriaList: Criteria[],
  operation: DataContextOperationOptions,
  dataContext: DataContext<ItemType, UniquelyIdentifyingFieldName>
): boolean => {
  const { fields } = dataContext;

  for (const criterion of criteriaList) {
    const { type } = criterion;

    if (
      type === SearchCriterionTypes.CRITERION ||
      type === SearchCriterionTypes.NESTED_CRITERION
    ) {
      const { field } = criterion;
      const { allowedOperations = [] }: Partial<DataContextField> =
        fields[field] || {};
      const isDisallowedField = !dataContextOperationIsAllowed(
        operation,
        allowedOperations
      );

      if (isDisallowedField) {
        return true;
      }
    }
  }

  return false;
};

export const criteriaListHasInvalidFieldOrValueType = <
  DCM extends DataContextMap,
  ContextName extends keyof DCM
>(
  criteriaList: Criteria[],
  contextName: ContextName,
  dataContextMap: DCM
): boolean => {
  type ItemType = DataContextItemType<DCM[typeof contextName]>;
  const { uniquelyIdentifyingFieldName, fields = {} } =
    dataContextMap[contextName as keyof DCM];
  const dataContextList = Object.keys(dataContextMap);
  const fieldList = Object.keys(fields);

  for (const criterion of criteriaList) {
    const { type } = criterion;

    if (
      type === SearchCriterionTypes.CRITERION ||
      type === SearchCriterionTypes.NESTED_CRITERION
    ) {
      const { field, value } = criterion;

      if (!fieldList.includes(field)) {
        return true;
      } else {
        const { typeName } = fields[field] as DataContextField;

        if (dataContextList.includes(typeName)) {
          continue;
        } else if (typeof value !== typeName) {
          return true;
        }
      }
    }
  }

  return false;
};

// TODO: Make these functions return a list of issues.
