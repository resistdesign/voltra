import {
  addRouteMapToRouteMap,
  addRoutesToRouteMap,
  type RouteMap,
} from "../../src/api/Router";
import { getTypeInfoORMRouteMap } from "../../src/api/ORM";
import { DynamoDBDataItemDBDriver } from "../../src/api/ORM/drivers";
import { TypeInfo } from "../../src/common/TypeParsing/TypeInfo";
import { DEMO_ORM_ROUTE_PATH } from "../common/Constants";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import { fullTextBackend } from "./fullTextBackend";
import { relationalBackend } from "./relationalBackend";
import { structuredReader, structuredWriter } from "./structuredBackend";

/**
 * Base route map containing lightweight demo routes that do not rely on DynamoDB.
 */
export const ROUTE_MAP: RouteMap = addRoutesToRouteMap({}, [
  {
    path: "/hello",
    /**
     * Simple hello-world route demonstrating the router wiring.
     */
    handler: async () => {
      return "UPDATES! :D";
    },
    authConfig: {
      public: true,
    },
  },
]);

/**
 * Route map augmented with DynamoDB-backed ORM routes and indexing integrations.
 */
export const ROUTE_MAP_WITH_DB: RouteMap = addRouteMapToRouteMap(
  ROUTE_MAP,
  getTypeInfoORMRouteMap(
    {
      typeInfoMap: DemoTypeInfoMap,
      /**
       * Supplies a DynamoDB driver keyed by the demo type's primary field.
       */
      getDriver: (typeName: string) => {
        const { primaryField }: Partial<TypeInfo> =
          DemoTypeInfoMap[typeName] || {};

        if (primaryField) {
          return new DynamoDBDataItemDBDriver({
            tableName: typeName,
            uniquelyIdentifyingFieldName: primaryField,
          });
        }

        throw new Error("Invalid type.");
      },
      indexing: {
        fullText: {
          backend: fullTextBackend,
          defaultIndexFieldByType: {
            Person: "lastName",
            Car: "model",
          },
        },
        structured: {
          reader: structuredReader,
          writer: structuredWriter,
        },
        relations: {
          backend: relationalBackend,
          /**
           * Generates a stable relation name for an origin type and field pair.
           */
          relationNameFor: (fromTypeName, fromTypeFieldName) =>
            `${fromTypeName}.${fromTypeFieldName}`,
        },
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
