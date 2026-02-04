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
  } else {
    const ormWithoutDAC = !dacConfig
      ? new TypeInfoORMService({
          ...config,
          useDAC: false,
        })
      : undefined;
    const ormWithDAC = dacConfig
      ? new TypeInfoORMService({
          ...config,
          useDAC: true,
          dacConfig,
        })
      : undefined;
    const ormMethodFactory = (
      methodName: keyof TypeInfoORMAPI,
      eventData: NormalizedCloudFunctionEventData,
    ): RouteHandler => {
      if (ormWithoutDAC) {
        return ormWithoutDAC[methodName];
      }

      const { authInfo } = eventData;
      const accessingRoleId = getAccessingRoleId
        ? getAccessingRoleId(authInfo)
        : undefined;

      if (dacConfig && !accessingRoleId) {
        throw {
          message: TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE,
        };
      }

      const context = accessingRoleId
        ? { accessingRoleId }
        : undefined;

      const method = (ormWithDAC as TypeInfoORMService)[
        methodName
      ] as (...args: any[]) => Promise<any>;

      return ((...args: any[]) => method(...args, context)) as RouteHandler;
    };
    const getRoute = (
      path: string,
      methodName: keyof TypeInfoORMAPI,
    ): Route => ({
      path,
      authConfig: authConfig ?? {
        anyAuthorized: true,
      },
      handlerFactory: (eventData) => ormMethodFactory(methodName, eventData),
    });

    let routeMap: RouteMap = {};

    for (const p in TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP) {
      const m = TYPE_INFO_ORM_API_PATH_METHOD_NAME_MAP[p];

      routeMap = addRouteToRouteMap(routeMap, getRoute(p, m));
    }

    return routeMap;
  }
};
