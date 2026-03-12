import {
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
  OperationGroup,
  RelationshipOperation,
  TypeInfoORMAPIRoutePaths,
  TypeInfoORMServiceError,
  TypeInfoORMUpdateOperators,
} from "./Types";

export const runTypeInfoORMTypesResourceNameScenario = () =>
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME;

export const runTypeInfoORMTypesRelationshipOperationsScenario = () =>
  Object.values(RelationshipOperation);

export const runTypeInfoORMTypesOperationGroupsScenario = () =>
  Object.values(OperationGroup);

export const runTypeInfoORMTypesApiRoutesScenario = () =>
  Object.values(TypeInfoORMAPIRoutePaths);

export const runTypeInfoORMTypesUpdateOperatorsScenario = () =>
  TypeInfoORMUpdateOperators;

export const runTypeInfoORMTypesServiceErrorsScenario = () =>
  Object.values(TypeInfoORMServiceError);
