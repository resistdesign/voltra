/**
 * @packageDocumentation
 *
 * Route map helpers that expose Type Info ORM operations over the Router layer.
 * Use {@link getTypeInfoORMRouteMap} to bind ORM methods to route paths, with
 * optional DAC enforcement and shared auth configuration.
 *
 * Example wiring:
 * ```ts
 * import { getTypeInfoORMRouteMap } from "./ORMRouteMap";
 * import { addRouteMapToRouteMap } from "../Router";
 *
 * const ormRoutes = getTypeInfoORMRouteMap({ typeInfoMap, getDriver });
 * const routeMap = addRouteMapToRouteMap({}, ormRoutes, "orm");
 * ```
 */
import {
  BaseTypeInfoORMServiceConfig,
  TypeInfoORMDACConfig,
  TypeInfoORMService,
} from "./TypeInfoORMService";
import {
  AuthInfo,
  NormalizedCloudFunctionEventData,
  Route,
  RouteAuthConfig,
  RouteHandler,
  RouteMap,
} from "../Router/Types";
import { addRouteToRouteMap } from "../Router";
import { TypeInfoORMAPI } from "../../common/TypeInfoORM";

/**
 * A collection of errors that can occur when creating or using a Type Info ORM Route Map.
 * */
export enum TYPE_INFO_ORM_ROUTE_MAP_ERRORS {
  MISSING_ACCESSING_ROLE = "MISSING_ACCESSING_ROLE",
  MISSING_ACCESSING_ROLE_GETTER = "MISSING_ACCESSING_ROLE_GETTER",
}

/**
 * A map of Type Info ORM API paths to method names.
 * */
export const TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP: Record<
  string,
  keyof TypeInfoORMAPI
> = {
  "create-relationship": "createRelationship",
  "delete-relationship": "deleteRelationship",
  "list-relationships": "listRelationships",
  "list-related-items": "listRelatedItems",
  create: "create",
  read: "read",
  update: "update",
  delete: "delete",
  list: "list",
};

/**
 * Get a route map for a Type Info ORM service.
 *
 * When DAC is enabled, `getAccessingRoleId` is required so each request can
 * resolve the accessing role id. If omitted, the route map throws
 * {@link TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE_GETTER}.
 * @returns Route map binding API paths to ORM handlers.
 */
export const getTypeInfoORMRouteMap = (
  /**
   * Base ORM service configuration for drivers and type info.
   */
  config: BaseTypeInfoORMServiceConfig,
  /**
   * Optional DAC configuration excluding the accessing role.
   */
  dacConfig?: TypeInfoORMDACConfig,
  /**
   * Optional getter to resolve the accessing role id from auth info.
   */
  getAccessingRoleId?: (authInfo: AuthInfo) => string,
  /**
   * Optional route-level auth configuration.
   */
  authConfig?: RouteAuthConfig,
): RouteMap => {
  if (dacConfig && !getAccessingRoleId) {
    throw {
      message: TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE_GETTER,
    };
  }

  const orm = new TypeInfoORMService({
    ...(dacConfig
      ? {
          ...config,
          useDAC: true as const,
          dacConfig,
        }
      : {
          ...config,
          useDAC: false as const,
        }),
  });
  const defaultAuthConfig: RouteAuthConfig = authConfig ?? {
    anyAuthorized: true,
  };
  const resolveContext = (
    eventData: NormalizedCloudFunctionEventData,
  ): ReturnType<typeof getContextFromEventData> =>
    getContextFromEventData(eventData, dacConfig, getAccessingRoleId);

  const createRoute = (
    path: string,
    handlerFactory: (eventData: NormalizedCloudFunctionEventData) => RouteHandler,
  ): Route => ({
    path,
    authConfig: defaultAuthConfig,
    handlerFactory,
  });

  const createHandlerFactory = (
    _eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => orm.create;
  const createHandlerFactoryWithDAC = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    resolveContext(eventData);

    return orm.create;
  };
  const readHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.read;
    }

    const context = resolveContext(eventData);

    return ((
      typeName: string,
      primaryFieldValue: any,
      selectedFields?: string[],
    ) => orm.read(typeName, primaryFieldValue, selectedFields, context)) as RouteHandler;
  };
  const updateHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.update;
    }

    const context = resolveContext(eventData);

    return ((typeName: string, item: any) => orm.update(typeName, item, context)) as RouteHandler;
  };
  const deleteHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.delete;
    }

    const context = resolveContext(eventData);

    return ((
      typeName: string,
      primaryFieldValue: any,
    ) => orm.delete(typeName, primaryFieldValue, context)) as RouteHandler;
  };
  const listHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.list;
    }

    const context = resolveContext(eventData);

    return ((
      typeName: string,
      listConfig: any,
      selectedFields?: string[],
    ) => orm.list(typeName, listConfig, selectedFields, context)) as RouteHandler;
  };
  const createRelationshipHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.createRelationship;
    }

    const context = resolveContext(eventData);

    return ((relationshipItem: any) => orm.createRelationship(relationshipItem, context)) as RouteHandler;
  };
  const deleteRelationshipHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.deleteRelationship;
    }

    const context = resolveContext(eventData);

    return ((relationshipItem: any) => orm.deleteRelationship(relationshipItem, context)) as RouteHandler;
  };
  const listRelationshipsHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.listRelationships;
    }

    const context = resolveContext(eventData);

    return ((listRelationshipsConfig: any) => orm.listRelationships(listRelationshipsConfig, context)) as RouteHandler;
  };
  const listRelatedItemsHandlerFactory = (
    eventData: NormalizedCloudFunctionEventData,
  ): RouteHandler => {
    if (!dacConfig) {
      return orm.listRelatedItems;
    }

    const context = resolveContext(eventData);

    return ((
      listRelationshipsConfig: any,
      selectedFields?: string[],
    ) => orm.listRelatedItems(listRelationshipsConfig, selectedFields, context)) as RouteHandler;
  };

  let routeMap: RouteMap = {};
  routeMap = addRouteToRouteMap(
    routeMap,
    createRoute("create-relationship", createRelationshipHandlerFactory),
  );
  routeMap = addRouteToRouteMap(
    routeMap,
    createRoute("delete-relationship", deleteRelationshipHandlerFactory),
  );
  routeMap = addRouteToRouteMap(
    routeMap,
    createRoute("list-relationships", listRelationshipsHandlerFactory),
  );
  routeMap = addRouteToRouteMap(
    routeMap,
    createRoute("list-related-items", listRelatedItemsHandlerFactory),
  );
  routeMap = addRouteToRouteMap(
    routeMap,
    createRoute("create", dacConfig ? createHandlerFactoryWithDAC : createHandlerFactory),
  );
  routeMap = addRouteToRouteMap(routeMap, createRoute("read", readHandlerFactory));
  routeMap = addRouteToRouteMap(routeMap, createRoute("update", updateHandlerFactory));
  routeMap = addRouteToRouteMap(routeMap, createRoute("delete", deleteHandlerFactory));
  routeMap = addRouteToRouteMap(routeMap, createRoute("list", listHandlerFactory));

  return routeMap;
};

const getContextFromEventData = (
  eventData: NormalizedCloudFunctionEventData,
  dacConfig?: TypeInfoORMDACConfig,
  getAccessingRoleId?: (authInfo: AuthInfo) => string,
) => {
  if (!dacConfig) {
    return undefined;
  }

  const { authInfo } = eventData;
  const accessingRoleId = getAccessingRoleId
    ? getAccessingRoleId(authInfo)
    : undefined;

  if (!accessingRoleId) {
    throw {
      message: TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE,
    };
  }

  return { accessingRoleId };
};
