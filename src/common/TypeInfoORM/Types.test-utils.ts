import {
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
  OperationGroup,
  RelationshipOperation,
  TypeInfoORMAPIRoutePaths,
  TypeInfoORMServiceError,
} from "./Types";

export const runTypeInfoORMTypesScenario = () => {
  return {
    resourceName: ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
    relationshipOperations: Object.values(RelationshipOperation),
    operationGroups: Object.values(OperationGroup),
    apiRoutes: Object.values(TypeInfoORMAPIRoutePaths),
    serviceErrors: Object.values(TypeInfoORMServiceError),
  };
};
