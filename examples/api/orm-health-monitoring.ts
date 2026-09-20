import {
  TypeInfoORMService,
  type DataItemDBDriver,
  type RouteMap,
} from "@resistdesign/voltra/api";
import {
  DriverHealthStore,
  TypeInfoORMHealthMonitor,
  TypeInfoORMHealthOperationRecorder,
  addTypeInfoORMHealthMCPToRouteMap,
  type HealthRecord,
} from "@resistdesign/voltra/health";

// Use the same fully configured ORM dependencies as the application API.
declare const orm: TypeInfoORMService;

// Health uses one normal driver-backed record collection.
// DynamoDB, in-memory, S3-backed custom drivers, and future drivers can all
// satisfy the same DataItemDBDriver contract.
declare const healthDriver: DataItemDBDriver<HealthRecord, "id">;

const store = new DriverHealthStore(healthDriver);
const monitor = new TypeInfoORMHealthMonitor({
  orm,
  store,
  maxIndexDocumentsPerRun: 200,
  maxRepairsPerRun: 20,
  maxSchemaItemsPerRun: 100,
});

// Attach once in the application process. Only slow or failed operations are
// persisted, keeping normal ORM traffic lightweight.
const operationRecorder = new TypeInfoORMHealthOperationRecorder({
  store,
  slowOperationMs: 1000,
});
operationRecorder.attach(orm);

// Safe for CI, diagnostics, or an operator preview.
export const previewHealth = async () => monitor.preview();

// Suitable for a scheduled job. Each call is bounded and resumes persisted work.
export const runHealthJob = async () => monitor.repair();

// The same monitor can be exposed to agents through Voltra's native MCP
// RouteMap integration. Authentication/roles remain application-owned.
export const addHealthMCP = (routeMap: RouteMap): RouteMap =>
  addTypeInfoORMHealthMCPToRouteMap(routeMap, {
    monitor,
    path: "health-mcp",
    name: "My App Health",
    version: "1.0.0",
    authConfig: {
      allowedRoles: ["HealthAdmin"],
    },
    // Destructive MCP repair is deliberately opt-in.
    enableRepairTool: true,
  });
