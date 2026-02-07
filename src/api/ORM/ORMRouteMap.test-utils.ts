import type { NormalizedCloudFunctionEventData, Route } from "../Router/Types";
import type {
  BaseTypeInfoORMServiceConfig,
  TypeInfoORMDACConfig,
} from "./TypeInfoORMService";
import type { DataItemDBDriver } from "./drivers/common/Types";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";
import { mergeStringPaths } from "../../common/Routing";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import {
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
  OperationGroup,
} from "../../common/TypeInfoORM";
import {
  DACConstraintType,
  WILDCARD_SIGNIFIER_PROTOTYPE,
} from "../DataAccessControl";
import {
  getTypeInfoORMRouteMap,
  TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP,
  TYPE_INFO_ORM_ROUTE_MAP_ERRORS,
} from "./ORMRouteMap";

const buildConfig = (): BaseTypeInfoORMServiceConfig => ({
  typeInfoMap: {
    Person: {
      primaryField: "id",
      fields: {
        id: {
          type: "string",
          array: false,
          readonly: false,
          optional: false,
          tags: { primaryField: true },
        },
        name: {
          type: "string",
          array: false,
          readonly: false,
          optional: false,
        },
        friend: {
          type: "string",
          array: true,
          readonly: false,
          optional: true,
          typeReference: "Person",
        },
      },
    },
  },
  getDriver: () =>
    new InMemoryDataItemDBDriver({
      tableName: "TestItems",
      uniquelyIdentifyingFieldName: "id",
    }),
  getRelationshipDriver: () =>
    new InMemoryItemRelationshipDBDriver({
      tableName: "Relationships",
      uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
    }),
});

const buildDacConfig = (): TypeInfoORMDACConfig => ({
  itemResourcePathPrefix: ["ORM"],
  relationshipResourcePathPrefix: ["ORM"],
  getDACRoleById: async (id: string) => ({
    id,
    constraints: [
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          OperationGroup.ALL_OPERATIONS,
          "Person",
          WILDCARD_SIGNIFIER_PROTOTYPE,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          OperationGroup.ALL_OPERATIONS,
          ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
          WILDCARD_SIGNIFIER_PROTOTYPE,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          TypeOperation.READ,
          "Person",
          WILDCARD_SIGNIFIER_PROTOTYPE,
          "name",
          WILDCARD_SIGNIFIER_PROTOTYPE,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          TypeOperation.READ,
          "Person",
          WILDCARD_SIGNIFIER_PROTOTYPE,
          "id",
          WILDCARD_SIGNIFIER_PROTOTYPE,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          TypeOperation.CREATE,
          "Person",
          WILDCARD_SIGNIFIER_PROTOTYPE,
          "name",
          WILDCARD_SIGNIFIER_PROTOTYPE,
        ],
      },
    ],
  }),
});

const eventData: NormalizedCloudFunctionEventData = {
  authInfo: { userId: "user-1" },
  headers: {},
  method: "POST",
  path: "/create",
  body: {},
};

const getHandlerFactory = (route: Route) => {
  if ("handlerFactory" in route && route.handlerFactory) {
    return route.handlerFactory;
  }
  throw new Error("Missing handler factory.");
};

export const runORMRouteMapScenario = () => {
  const config = buildConfig();
  const routeMap = getTypeInfoORMRouteMap(config);
  const routePaths = Object.keys(routeMap).sort();
  const createPath = mergeStringPaths("", "create");
  const createRoute = routeMap[createPath];
  const createHandlerFactory = getHandlerFactory(createRoute);
  const handler1 = createHandlerFactory(eventData);
  const handler2 = createHandlerFactory(eventData);

  const customAuthConfig = { public: true };
  const routeMapWithAuth = getTypeInfoORMRouteMap(
    config,
    undefined,
    undefined,
    customAuthConfig,
  );

  const dacConfig = buildDacConfig();
  let missingGetterError: string | undefined;
  try {
    getTypeInfoORMRouteMap(config, dacConfig);
  } catch (error: any) {
    missingGetterError = error?.message ?? String(error);
  }

  const routeMapWithMissingRole = getTypeInfoORMRouteMap(
    config,
    dacConfig,
    () => undefined as unknown as string,
  );
  let missingRoleError: string | undefined;
  try {
    getHandlerFactory(routeMapWithMissingRole[createPath])(eventData);
  } catch (error: any) {
    missingRoleError = error?.message ?? String(error);
  }

  const routeMapWithRole = getTypeInfoORMRouteMap(
    config,
    dacConfig,
    () => "role-1",
  );
  const handlerWithRole = getHandlerFactory(routeMapWithRole[createPath])(
    eventData,
  );

  return {
    routePaths,
    expectedRoutePaths: Object.keys(TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP)
      .map((path) => mergeStringPaths("", path))
      .sort(),
    defaultAuthConfig: routeMap[createPath].authConfig,
    customAuthConfig: routeMapWithAuth[createPath].authConfig,
    handlerIsFunction: typeof handler1 === "function",
    handlerStableWithoutDac: handler1 === handler2,
    missingGetterError,
    missingRoleError,
    missingRoleErrorExpected:
      TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE,
    missingGetterErrorExpected:
      TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE_GETTER,
    handlerWithRoleIsFunction: typeof handlerWithRole === "function",
  };
};

export const runORMRouteMapDacSelectedFieldsPaddingScenario = async () => {
  const typeInfoMap = buildConfig().typeInfoMap;
  const itemDriver = new InMemoryDataItemDBDriver({
    tableName: "TestItemsShared",
    uniquelyIdentifyingFieldName: "id",
  });
  const relationshipDriver = new InMemoryItemRelationshipDBDriver({
    tableName: "RelationshipsShared",
    uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
  });
  const config: BaseTypeInfoORMServiceConfig = {
    typeInfoMap,
    getDriver: () => itemDriver as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => relationshipDriver,
  };
  const dacConfig = buildDacConfig();
  const routeMapWithoutDAC = getTypeInfoORMRouteMap(config);
  const routeMapWithRole = getTypeInfoORMRouteMap(
    config,
    dacConfig,
    () => "role-1",
  );
  const listPath = mergeStringPaths("", "list");
  const readPath = mergeStringPaths("", "read");
  const listRelatedItemsPath = mergeStringPaths("", "list-related-items");
  const createPath = mergeStringPaths("", "create");
  const listRelationshipsPath = mergeStringPaths("", "list-relationships");
  const listHandler = getHandlerFactory(routeMapWithRole[listPath])(eventData);
  const readHandler = getHandlerFactory(routeMapWithRole[readPath])(eventData);
  const listRelatedItemsHandler = getHandlerFactory(
    routeMapWithRole[listRelatedItemsPath],
  )(eventData);
  const createHandler = getHandlerFactory(routeMapWithoutDAC[createPath])(
    eventData,
  );
  const listRelationshipsHandler = getHandlerFactory(
    routeMapWithRole[listRelationshipsPath],
  )(eventData);

  let setupError: string | null = null;
  let personAId: string = "";
  let personBId: string = "";
  try {
    personAId = await createHandler("Person", { name: "Alice" });
    personBId = await createHandler("Person", { name: "Bob" });
  } catch (error: any) {
    setupError = error?.message ?? String(error);
  }

  const relationshipItemOrigin = {
    relationshipItemOrigin: {
      fromTypeName: "Person",
      fromTypeFieldName: "friend",
      fromTypePrimaryFieldValue: personAId,
    },
  };

  let listOmittedSelectedFieldsError: string | null = null;
  let listWithSelectedFieldsError: string | null = null;
  let readOmittedSelectedFieldsError: string | null = null;
  let readWithSelectedFieldsError: string | null = null;
  let listRelatedItemsOmittedSelectedFieldsError: string | null = null;
  let listRelatedItemsWithSelectedFieldsError: string | null = null;

  try {
    await listHandler("Person", { itemsPerPage: 5 });
  } catch (error: any) {
    listOmittedSelectedFieldsError = error?.message ?? String(error);
  }
  try {
    await listHandler("Person", { itemsPerPage: 5 }, ["name"]);
  } catch (error: any) {
    listWithSelectedFieldsError = error?.message ?? String(error);
  }

  try {
    await readHandler("Person", personAId);
  } catch (error: any) {
    readOmittedSelectedFieldsError = error?.message ?? String(error);
  }
  try {
    await readHandler("Person", personAId, ["name"]);
  } catch (error: any) {
    readWithSelectedFieldsError = error?.message ?? String(error);
  }

  try {
    await listRelatedItemsHandler(relationshipItemOrigin);
  } catch (error: any) {
    listRelatedItemsOmittedSelectedFieldsError =
      error?.message ?? String(error);
  }
  try {
    await listRelatedItemsHandler(relationshipItemOrigin, ["name"]);
  } catch (error: any) {
    listRelatedItemsWithSelectedFieldsError = error?.message ?? String(error);
  }

  let listCount: number | null = null;
  let readMatchesPersonAId: boolean | null = null;
  let listRelatedItemsCount: number | null = null;
  let listRelatedItemsId: string | null = null;
  let listRelationshipsCount: number | null = null;

  if (!setupError) {
    const listResult = await listHandler("Person", { itemsPerPage: 5 });
    const readResult = await readHandler("Person", personAId);
    const listRelatedItemsResult = await listRelatedItemsHandler(
      relationshipItemOrigin,
    );
    const listRelationshipsResult = await listRelationshipsHandler({
      ...relationshipItemOrigin,
      itemsPerPage: 5,
    });
    listCount = listResult.items.length;
    readMatchesPersonAId = readResult.id === personAId;
    listRelatedItemsCount = listRelatedItemsResult.items.length;
    listRelatedItemsId = (listRelatedItemsResult.items[0]?.id as string) ?? null;
    listRelationshipsCount = listRelationshipsResult.items.length;
  }

  return {
    setupError,
    listOmittedSelectedFieldsError,
    listWithSelectedFieldsError,
    readOmittedSelectedFieldsError,
    readWithSelectedFieldsError,
    listRelatedItemsOmittedSelectedFieldsError,
    listRelatedItemsWithSelectedFieldsError,
    listCount,
    readMatchesPersonAId,
    listRelatedItemsCount,
    listRelatedItemsId,
    listRelationshipsCount,
    hasPersonAId: !!personAId,
    hasPersonBId: !!personBId,
  };
};

export const runORMRouteMapExplicitHandlerArgumentScenario = async () => {
  const buildRouteMaps = () => {
    const baseTypeInfoMap = buildConfig().typeInfoMap;
    const personTypeInfo = baseTypeInfoMap.Person;

    if (!personTypeInfo) {
      throw new Error("Missing Person type info.");
    }

    const personFields = personTypeInfo.fields;

    if (!personFields?.name) {
      throw new Error("Missing Person.name field.");
    }

    const personNameField = personFields.name;
    const typeInfoMap = {
      ...baseTypeInfoMap,
      Person: {
        ...personTypeInfo,
        fields: {
          ...personFields,
          name: {
            ...personNameField,
            optional: true,
          },
        },
      },
    };
    const itemDriver = new InMemoryDataItemDBDriver({
      tableName: "ExplicitHandlerItems",
      uniquelyIdentifyingFieldName: "id",
    });
    const relationshipDriver = new InMemoryItemRelationshipDBDriver({
      tableName: "ExplicitHandlerRelationships",
      uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
    });
    const config: BaseTypeInfoORMServiceConfig = {
      typeInfoMap,
      getDriver: () => itemDriver as DataItemDBDriver<any, any>,
      getRelationshipDriver: () => relationshipDriver,
    };
    const routeMapWithoutDAC = getTypeInfoORMRouteMap(config);
    const routeMapWithRole = getTypeInfoORMRouteMap(
      config,
      buildDacConfig(),
      () => "role-1",
    );

    return {
      routeMapWithoutDAC,
      routeMapWithRole,
    };
  };
  const runFlow = async (routeMap: Record<string, Route>) => {
    const createPath = mergeStringPaths("", "create");
    const readPath = mergeStringPaths("", "read");
    const updatePath = mergeStringPaths("", "update");
    const deletePath = mergeStringPaths("", "delete");
    const listPath = mergeStringPaths("", "list");
    const createRelationshipPath = mergeStringPaths("", "create-relationship");
    const deleteRelationshipPath = mergeStringPaths("", "delete-relationship");
    const listRelationshipsPath = mergeStringPaths("", "list-relationships");
    const createHandler = getHandlerFactory(routeMap[createPath])(eventData);
    const readHandler = getHandlerFactory(routeMap[readPath])(eventData);
    const updateHandler = getHandlerFactory(routeMap[updatePath])(eventData);
    const deleteHandler = getHandlerFactory(routeMap[deletePath])(eventData);
    const listHandler = getHandlerFactory(routeMap[listPath])(eventData);
    const createRelationshipHandler = getHandlerFactory(
      routeMap[createRelationshipPath],
    )(eventData);
    const deleteRelationshipHandler = getHandlerFactory(
      routeMap[deleteRelationshipPath],
    )(eventData);
    const listRelationshipsHandler = getHandlerFactory(
      routeMap[listRelationshipsPath],
    )(eventData);
    const personAId = await createHandler("Person", { name: "Alice" });
    const personBId = await createHandler("Person", { name: "Bob" });
    const relationshipItem = {
      fromTypeName: "Person",
      fromTypeFieldName: "friend",
      fromTypePrimaryFieldValue: personAId,
      toTypePrimaryFieldValue: personBId,
    };
    const updateResult = await updateHandler("Person", {
      id: personAId,
      name: "Alice Updated",
    });
    const updatedPerson = await readHandler("Person", personAId, ["name"]);
    const createRelationshipResult =
      await createRelationshipHandler(relationshipItem);
    const listRelationshipsBeforeDelete = await listRelationshipsHandler({
      relationshipItemOrigin: {
        fromTypeName: "Person",
        fromTypeFieldName: "friend",
        fromTypePrimaryFieldValue: personAId,
      },
      itemsPerPage: 5,
    });
    const deleteRelationshipResult =
      await deleteRelationshipHandler(relationshipItem);
    const listRelationshipsAfterDelete = await listRelationshipsHandler({
      relationshipItemOrigin: {
        fromTypeName: "Person",
        fromTypeFieldName: "friend",
        fromTypePrimaryFieldValue: personAId,
      },
      itemsPerPage: 5,
    });
    const deletePersonResult = await deleteHandler("Person", personBId);

    return {
      hasPersonAId: !!personAId,
      hasPersonBId: !!personBId,
      updateResult,
      updatedName: updatedPerson.name,
      createRelationshipResult,
      listRelationshipsBeforeDeleteCount:
        listRelationshipsBeforeDelete.items.length,
      deleteRelationshipResult,
      listRelationshipsAfterDeleteCount: listRelationshipsAfterDelete.items.length,
      deletePersonResult,
    };
  };
  const { routeMapWithoutDAC, routeMapWithRole } = buildRouteMaps();
  const withoutDAC = await runFlow(routeMapWithoutDAC);
  const withDAC = await runFlow(routeMapWithRole);

  return {
    withoutDAC,
    withDAC,
    parity: JSON.stringify(withoutDAC) === JSON.stringify(withDAC),
  };
};
