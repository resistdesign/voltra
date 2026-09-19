import {
  DACConstraintType,
  DynamoDBDataItemDBDriver,
  addRouteMapToRouteMap,
  addRoutesToRouteMap,
  getTypeInfoORMRouteMap,
  getTypeInfoORMIndexingConfigFromTypeInfoMap,
  type RouteMap,
  type DACRole,
  type BaseTypeInfoORMServiceConfig,
} from "../../src/api";
import type { TypeInfo } from "../../src/common";
import { DEMO_ORM_ROUTE_PATH } from "../common/Constants";
import { DemoTypeInfoMap } from "../common/DemoTypeInfoMap";
import {
  indexBackend,
  indexMutationCoordinator,
  relationalBackend,
  structuredStringTokenizer,
} from "./indexing";
import { addDemoMCPToRouteMap } from "./mcp";
import { addDemoHealthMCPToRouteMap } from "./health";

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
 * Shared demo ORM configuration used by both RPC routes and MCP tools.
 */
export const DEMO_ORM_CONFIG = {
  typeInfoMap: DemoTypeInfoMap,
  /**
   * Supplies a DynamoDB driver keyed by the demo type's primary field.
   */
  getDriver: (typeName: string) => {
    const { primaryField }: Partial<TypeInfo> = DemoTypeInfoMap[typeName] || {};

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
  indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(DemoTypeInfoMap, {
    mutationCoordinator: indexMutationCoordinator,
    backend: indexBackend,
    tokenizer: structuredStringTokenizer,
    allowFullScanFallback: true,
    relations: {
      backend: relationalBackend,
      /**
       * Generates a stable relation name for an origin type and field pair.
       */
      relationNameFor: (fromTypeName, fromTypeFieldName) =>
        `${fromTypeName}.${fromTypeFieldName}`,
    },
  }),
} satisfies BaseTypeInfoORMServiceConfig;

const ROUTE_MAP_WITH_ORM: RouteMap = addRouteMapToRouteMap(
  ROUTE_MAP,
  getTypeInfoORMRouteMap(
    DEMO_ORM_CONFIG,
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

const ROUTE_MAP_WITH_MCP: RouteMap = addDemoMCPToRouteMap(
  ROUTE_MAP_WITH_ORM,
  DEMO_ORM_CONFIG,
);

/**
 * Complete demo API route map, including the application MCP endpoint and the
 * public read-only Health MCP endpoint.
 */
export const ROUTE_MAP_WITH_DB: RouteMap = addDemoHealthMCPToRouteMap(
  ROUTE_MAP_WITH_MCP,
  DEMO_ORM_CONFIG,
);
