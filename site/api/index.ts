import {
  addRouteMapToRouteMap,
  addRoutesToRouteMap,
  AWS,
  handleCloudFunctionEvent,
} from "../../src/api/Router";
import { CloudFunctionResponse, RouteMap } from "../../src/api/Router/Types";
import { getTypeInfoORMRouteMap } from "../../src/api/ORM";
import { TypeInfo } from "../../src/common/TypeParsing/TypeInfo";
import { DynamoDBDataItemDBDriver } from "../../src/api/ORM/drivers";
import { ItemRelationshipInfoIdentifyingKeys } from "../../src/common/ItemRelationshipInfoTypes";
import { DEMO_ORM_ROUTE_PATH, DEMO_TYPE_INFO_MAP } from "../common/Constants";
import normalizeCloudFunctionEvent = AWS.normalizeCloudFunctionEvent;

const ROUTE_MAP: RouteMap = addRoutesToRouteMap({}, [
  {
    path: "/hello",
    handler: async () => {
      return "UPDATES! :D";
    },
    authConfig: {
      public: true,
    },
  },
]);
const ROUTE_MAP_WITH_DB: RouteMap = addRouteMapToRouteMap(
  ROUTE_MAP,
  getTypeInfoORMRouteMap({
    typeInfoMap: DEMO_TYPE_INFO_MAP,
    getDriver: (typeName: string) => {
      const { primaryField }: Partial<TypeInfo> =
        DEMO_TYPE_INFO_MAP[typeName] || {};

      if (primaryField) {
        return new DynamoDBDataItemDBDriver({
          tableName: typeName,
          uniquelyIdentifyingFieldName: primaryField,
        });
      } else {
        throw new Error("Invalid type.");
      }
    },
    getRelationshipDriver: (_typeName: string, _fieldName: string) => {
      return new DynamoDBDataItemDBDriver({
        tableName: `__RELATIONSHIPS__`,
        uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
      });
    },
  }),
  DEMO_ORM_ROUTE_PATH,
);

export const handlerInternal = async (
  event: any,
): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(
    event,
    normalizeCloudFunctionEvent,
    ROUTE_MAP_WITH_DB,
    [
      process.env.CLIENT_ORIGIN as string,
      process.env.DEV_CLIENT_ORIGIN as string,
    ],
  );

export const handler = (...args: any[]) => {
  console.log("HANDLER ARGS:", args);

  return handlerInternal(...(args as [any]));
};
