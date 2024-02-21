import {
  Criteria,
  Criterion,
  CriterionGroup,
  CriterionPath,
  SearchCriterionLogicalGroupingTypes,
  SearchCriterionTypes,
} from "../SearchCriteriaTypes";

export type CriterionTranslator<ReturnType> = (
  criterion: Criterion,
  fieldOrderPath: number[],
  fieldNamePath: string[],
) => ReturnType;

export type CriterionGroupTranslator<ReturnType> = (
  translatedCriterionList: any[],
  relationshipType: SearchCriterionLogicalGroupingTypes,
  fieldOrderPath: number[],
  fieldNamePath: string[],
) => ReturnType;

export const processCriteria = <TranslatedCriterion, TranslatedCriterionGroup>(
  criteria: Criteria,
  criterionTranslator: CriterionTranslator<TranslatedCriterion>,
  criterionGroupTranslator: CriterionGroupTranslator<TranslatedCriterionGroup>,
  pathDelimiter: string = ".",
  parentOrderPath: number[] = [],
  parentPath: string[] = [],
  fieldIndex: number = 0,
): TranslatedCriterion | TranslatedCriterionGroup => {
  const { type } = criteria;
  const orderPath = [...parentOrderPath, fieldIndex];

  if (type === SearchCriterionTypes.CRITERION) {
    const { field } = criteria;
    const path = [...parentPath, field];

    return criterionTranslator(
      {
        ...criteria,
      },
      orderPath,
      path,
    );
  } else if (type === SearchCriterionTypes.NESTED_CRITERION) {
    const { field, value } = criteria as CriterionPath;
    const path = [...parentPath, field];

    return processCriteria(
      value,
      criterionTranslator,
      criterionGroupTranslator,
      pathDelimiter,
      orderPath,
      path,
      0,
    );
  } else {
    const { logicalGroupingType, criteria: criteriaList = [] } =
      criteria as CriterionGroup;

    return criterionGroupTranslator(
      criteriaList.map((criterion, subFieldIndex) =>
        processCriteria(
          criterion,
          criterionTranslator,
          criterionGroupTranslator,
          pathDelimiter,
          orderPath,
          parentPath,
          subFieldIndex,
        ),
      ),
      logicalGroupingType,
      orderPath,
      parentPath,
    );
  }
};
