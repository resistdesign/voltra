import {
  BaseTypeInfoORMServiceConfig,
  TypeInfoORMDACConfig,
  TypeInfoORMService,
  TypeInfoORMServiceDACOptions,
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
import { DACRole } from "../DataAccessControl";

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
 * */
export const getTypeInfoORMRouteMap = (
  config: BaseTypeInfoORMServiceConfig,
  dacConfig?: Omit<TypeInfoORMDACConfig, "accessingRole">,
  getAccessingRole?: (authInfo: AuthInfo) => DACRole,
  authConfig?: RouteAuthConfig,
): RouteMap => {
  if (dacConfig && !getAccessingRole) {
    throw {
      message: TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE_GETTER,
    };
  } else {
    const ormMethodFactory = (
      methodName: keyof TypeInfoORMAPI,
      eventData: NormalizedCloudFunctionEventData,
    ): RouteHandler => {
      const { authInfo } = eventData;
      const accessingRole = getAccessingRole
        ? getAccessingRole(authInfo)
        : undefined;

      if (dacConfig && !accessingRole) {
        throw {
          message: TYPE_INFO_ORM_ROUTE_MAP_ERRORS.MISSING_ACCESSING_ROLE,
        };
      } else {
        const dacOptions: TypeInfoORMServiceDACOptions = dacConfig
          ? {
              useDAC: true,
              dacConfig: {
                ...dacConfig,
                accessingRole: accessingRole as DACRole,
              },
            }
          : {
              useDAC: false,
            };
        // TODO: Maybe don't instantiate a new ORM service for each method.
        const orm = new TypeInfoORMService({
          ...config,
          ...dacOptions,
        });

        return orm[methodName];
      }
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
