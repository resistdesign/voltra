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
import { DEMO_ORM_ROUTE_PATH } from "../common/Constants";
import { DEMO_TYPE_INFO_MAP } from "../common/TypeConstants";
import {
  ERROR_MESSAGE_CONSTANTS,
  PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
} from "../../src/common/TypeParsing/Validation";
import { TypeInfoORMServiceError } from "../../src/common/TypeInfoORM";
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

const demoTypeInfoMap = DEMO_TYPE_INFO_MAP;

if (!demoTypeInfoMap || Object.keys(demoTypeInfoMap).length === 0) {
  console.error("TypeInfoORM route map initialized without a demo typeInfoMap.");

  throw new Error(TypeInfoORMServiceError.MISSING_TYPE_INFO_MAP);
}

const ROUTE_MAP_WITH_DB: RouteMap = addRouteMapToRouteMap(
  ROUTE_MAP,
  getTypeInfoORMRouteMap(
    {
      typeInfoMap: demoTypeInfoMap,
      getDriver: (typeName: string) => {
        const { primaryField }: Partial<TypeInfo> =
          demoTypeInfoMap[typeName] || {};

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
    },
    undefined,
    undefined,
    {
      public: true,
    },
  ),
  DEMO_ORM_ROUTE_PATH,
);

export const handler = async (event: any): Promise<CloudFunctionResponse> =>
  handleCloudFunctionEvent(
    event,
    normalizeCloudFunctionEvent,
    ROUTE_MAP_WITH_DB,
    [
      process.env.CLIENT_ORIGIN as string,
      process.env.DEV_CLIENT_ORIGIN as string,
    ],
    // TODO: What to really do with this?
    //  How do we decide which errors should go to the client?
    (error: unknown): boolean => {
      if (error && typeof error === "object" && "error" in error) {
        const { error: mainError } = error;

        if (typeof mainError === "string") {
          const primitiveErrorValues = Object.values(
            PRIMITIVE_ERROR_MESSAGE_CONSTANTS,
          );
          const validationErrorValues = Object.values(ERROR_MESSAGE_CONSTANTS);
          const typeInfoORMErrorValues = Object.values(TypeInfoORMServiceError);

          if (primitiveErrorValues.includes(mainError)) {
            return true;
          }

          if (validationErrorValues.includes(mainError)) {
            return true;
          }

          if (
            typeInfoORMErrorValues.includes(
              mainError as TypeInfoORMServiceError,
            )
          ) {
            return true;
          }
        }
      }

      return false;
    },
    true, // debug
  );
