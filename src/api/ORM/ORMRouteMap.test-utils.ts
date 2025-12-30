import type { NormalizedCloudFunctionEventData, Route } from "../Router/Types";
import type { DACRole } from "../DataAccessControl";
import type {
  BaseTypeInfoORMServiceConfig,
  TypeInfoORMDACConfig,
} from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";
import { mergeStringPaths } from "../../common/Routing";
import {
  getTypeInfoORMRouteMap,
  TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP,
  TYPE_INFO_ORM_ROUTE_MAP_ERRORS,
} from "./ORMRouteMap";

const buildConfig = (): BaseTypeInfoORMServiceConfig => ({
  typeInfoMap: {},
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

const buildDacConfig = (): Omit<TypeInfoORMDACConfig, "accessingRole"> => ({
  itemResourcePathPrefix: ["items"],
  relationshipResourcePathPrefix: ["relationships"],
  getDACRoleById: (id: string) => ({ id, constraints: [] }),
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
    () => undefined as unknown as DACRole,
  );
  let missingRoleError: string | undefined;
  try {
    getHandlerFactory(routeMapWithMissingRole[createPath])(eventData);
  } catch (error: any) {
    missingRoleError = error?.message ?? String(error);
  }

  const validRole: DACRole = { id: "role-1", constraints: [] };
  const routeMapWithRole = getTypeInfoORMRouteMap(
    config,
    dacConfig,
    () => validRole,
  );
  const handlerWithRole = getHandlerFactory(routeMapWithRole[createPath])(eventData);

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
    missingRoleErrorExpected: TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE,
    missingGetterErrorExpected:
      TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE_GETTER,
    handlerWithRoleIsFunction: typeof handlerWithRole === "function",
  };
};
