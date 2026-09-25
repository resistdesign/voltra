import {
  DynamoDBDataItemDBDriver,
  TypeInfoORMService,
  type BaseTypeInfoORMServiceConfig,
  type RouteMap,
} from "../../src/api";
import {
  DriverHealthStore,
  TypeInfoORMHealthMonitor,
  TypeInfoORMHealthOperationRecorder,
  addTypeInfoORMHealthMCPToRouteMap,
  type HealthRecord,
} from "../../src/health";
import {
  readHealthTableNameFromEnv,
} from "../common/HealthTable";
import { DEMO_HEALTH_MCP_ROUTE_PATH } from "../common/Constants";

const demoHealthDriver = new DynamoDBDataItemDBDriver<HealthRecord, "id">({
  tableName: readHealthTableNameFromEnv(process.env),
  uniquelyIdentifyingFieldName: "id",
});

/** Shared Health store used by demo telemetry and scheduled-style monitoring. */
export const demoHealthStore = new DriverHealthStore(demoHealthDriver);

/** Lightweight recorder attached to normal demo ORM traffic. */
export const demoHealthOperationRecorder =
  new TypeInfoORMHealthOperationRecorder({
    store: demoHealthStore,
  });

/**
 * Add a public, non-destructive Health MCP endpoint to the demo RouteMap.
 *
 * The live demo intentionally exposes preview only. Production consumers can
 * enable the repair tool behind their own authenticated Voltra role/group.
 */
export const addDemoHealthMCPToRouteMap = (
  routeMap: RouteMap,
  ormConfig: BaseTypeInfoORMServiceConfig,
): RouteMap => {
  const orm = new TypeInfoORMService({
    ...ormConfig,
    useDAC: false,
  });
  const monitor = new TypeInfoORMHealthMonitor({
    orm,
    store: demoHealthStore,
    repairMode: "preview",
    maxIndexDocumentsPerRun: 100,
    indexProbeCount: 2,
    maxProbeIndexDocumentsPerRun: 100,
    maxRepairsPerRun: 0,
    maxSchemaItemsPerRun: 50,
    indexPageSize: 50,
    retentionPageSize: 50,
  });

  return addTypeInfoORMHealthMCPToRouteMap(routeMap, {
    monitor,
    path: DEMO_HEALTH_MCP_ROUTE_PATH,
    name: "Voltra Health Demo",
    version: "1.0.0",
    authConfig: {
      public: true,
    },
  });
};
