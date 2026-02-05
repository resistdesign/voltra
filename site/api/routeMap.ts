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
import {
  DACConstraintType,
  type DACRole,
} from "../../src/api/DataAccessControl";
import {
  fullTextBackend,
  relationalBackend,
  structuredReader,
  structuredWriter,
} from "./indexing";

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
          const tableName =
            process.env[`TABLE_${typeName.toUpperCase()}`] ?? typeName;

          return new DynamoDBDataItemDBDriver({
            tableName,
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
    {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      getDACRoleById: async (id: string): Promise<DACRole> => ({
        id,
        constraints: [
          {
            type: DACConstraintType.ALLOW,
            pathIsPrefix: true,
            resourcePath: ["ORM"],
          },
          {
            type: DACConstraintType.ALLOW,
            pathIsPrefix: true,
            resourcePath: ["REL"],
          },
        ],
      }),
      getOwnerPrefix: async () => ["owner", "demo"],
    },
    (authInfo) => authInfo?.userId ?? "demo-role",
    {
      public: true,
    },
  ),
  DEMO_ORM_ROUTE_PATH,
);
