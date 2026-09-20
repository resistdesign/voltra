/**
 * @packageDocumentation
 *
 * MCP exposure helpers for bounded Voltra Health operations.
 */
import {
  addMCPToRouteMap,
  type MCPToolAnnotations,
} from "../api/MCP";
import type {
  RouteAuthConfig,
  RouteMap,
} from "../api/Router";
import type {
  TypeInfoMap,
  TypeInfoPack,
} from "../common/TypeParsing";
import type {
  TypeInfoORMHealthMonitor,
  TypeInfoORMHealthMonitorRunResult,
  TypeInfoORMHealthStatusOptions,
  TypeInfoORMHealthStatusResult,
} from "./TypeInfoORMHealthMonitor";

const HEALTH_MCP_RESULT_TYPE_INFO_MAP: TypeInfoMap = {
  TypeInfoORMHealthMonitorRunResult: {
    fields: {
      runId: {
        type: "string",
        array: false,
        readonly: true,
        optional: false,
      },
      repairMode: {
        type: "string",
        array: false,
        readonly: true,
        optional: false,
        possibleValues: ["preview", "apply"],
      },
      examinedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      orphanFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      confirmedOrphanCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      repairedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      schemaDriftFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      confirmedSchemaDriftCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      schemaReconciledItemCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      missingIndexFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      reindexedItemCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      slowOperationFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      failedOperationFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      operationRecordsProcessedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      suspiciousCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      expiredRecordCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      continuation: {
        type: "boolean",
        array: false,
        readonly: true,
        optional: false,
      },
    },
  },
};

const HEALTH_MCP_RESULT_TYPE_INFO_PACK: TypeInfoPack = {
  entryTypeName: "TypeInfoORMHealthMonitorRunResult",
  typeInfoMap: HEALTH_MCP_RESULT_TYPE_INFO_MAP,
};

const HEALTH_MCP_STATUS_TYPE_INFO_MAP: TypeInfoMap = {
  TypeInfoORMHealthStatusOptions: {
    fields: {
      itemsPerPage: {
        type: "number",
        array: false,
        readonly: true,
        optional: true,
      },
      cursor: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
    },
  },
  TypeInfoORMHealthStatusResult: {
    fields: {
      examinedRecordCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      openFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      confirmedFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      repairedFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      pendingOperationCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      statsRecordCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      repairRecordCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      failedRunCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      cursor: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      continuation: {
        type: "boolean",
        array: false,
        readonly: true,
        optional: false,
      },
    },
  },
};

const HEALTH_MCP_STATUS_INPUT_TYPE_INFO_PACK: TypeInfoPack = {
  entryTypeName: "TypeInfoORMHealthStatusOptions",
  typeInfoMap: HEALTH_MCP_STATUS_TYPE_INFO_MAP,
};

const HEALTH_MCP_STATUS_OUTPUT_TYPE_INFO_PACK: TypeInfoPack = {
  entryTypeName: "TypeInfoORMHealthStatusResult",
  typeInfoMap: HEALTH_MCP_STATUS_TYPE_INFO_MAP,
};

const PREVIEW_ANNOTATIONS: MCPToolAnnotations = {
  // Preview does not mutate application/index data, but it does persist
  // Health findings/checkpoints and may prune expired Health records.
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const REPAIR_ANNOTATIONS: MCPToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * Minimal Health monitor contract required by the MCP adapter.
 */
export type TypeInfoORMHealthMCPMonitor = Pick<
  TypeInfoORMHealthMonitor,
  "status" | "preview" | "repair"
>;

/**
 * Configuration for exposing one Health monitor through Voltra's native MCP
 * RouteMap integration.
 */
export type AddTypeInfoORMHealthMCPToRouteMapConfig = {
  /** Health monitor instance whose bounded operations become MCP tools. */
  monitor: TypeInfoORMHealthMCPMonitor;
  /** Route path for the MCP endpoint. Defaults to `health-mcp`. */
  path?: string;
  /** MCP server name. Defaults to `Voltra Health`. */
  name?: string;
  /** MCP server version. Defaults to `1.0.0`. */
  version?: string;
  /**
   * Normal Voltra route authorization applied to all Health MCP tools.
   *
   * Health operations can inspect internal state and apply destructive repairs,
   * so authorization is intentionally required rather than defaulted.
   */
  authConfig: RouteAuthConfig;
  /**
   * Expose the destructive `healthRepair` tool.
   *
   * Defaults to false so a Health MCP endpoint is read-only unless the
   * application explicitly opts into agent-triggered repair.
   */
  enableRepairTool?: boolean;
};

/**
 * Add bounded Health preview/repair tools to a Voltra RouteMap MCP endpoint.
 *
 * Applications own authentication infrastructure. For example, a Cognito-backed
 * app can map a dedicated group into Voltra roles and pass
 * `{ allowedRoles: ["HealthAdmin"] }` here.
 *
 * The exposed tools are deliberately small:
 * - `healthStatus` reads one bounded page of persisted Health state.
 * - `healthPreview` performs one bounded non-destructive monitor pass.
 * - `healthRepair` is opt-in and performs one bounded pass while applying
 *   only the monitor's strongly validated repairs.
 *
 * Both return continuation state so an agent or scheduled worker can continue
 * larger jobs without turning one request into unbounded maintenance work.
 *
 * @param routeMap Existing Voltra RouteMap.
 * @param config Health MCP configuration.
 * @returns New RouteMap with the Health MCP endpoint appended.
 */
export const addTypeInfoORMHealthMCPToRouteMap = (
  routeMap: RouteMap,
  config: AddTypeInfoORMHealthMCPToRouteMapConfig,
): RouteMap => {
  const { monitor } = config;

  return addMCPToRouteMap(routeMap, {
    path: config.path ?? "health-mcp",
    name: config.name ?? "Voltra Health",
    version: config.version ?? "1.0.0",
    authConfig: config.authConfig,
    tools: [
      {
        name: "healthStatus",
        description:
          "Read one bounded page of persisted Voltra Health status without running audits or repairs.",
        inputTypeInfo: HEALTH_MCP_STATUS_INPUT_TYPE_INFO_PACK,
        outputTypeInfo: HEALTH_MCP_STATUS_OUTPUT_TYPE_INFO_PACK,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        handler: async (
          input: TypeInfoORMHealthStatusOptions,
        ): Promise<TypeInfoORMHealthStatusResult> => monitor.status(input),
      },
      {
        name: "healthPreview",
        description:
          "Run one bounded, non-destructive Voltra ORM/index health pass. Reports orphaned indexes, schema drift, suspicious state, retention cleanup, and whether more work remains.",
        outputTypeInfo: HEALTH_MCP_RESULT_TYPE_INFO_PACK,
        annotations: PREVIEW_ANNOTATIONS,
        handler: async (): Promise<TypeInfoORMHealthMonitorRunResult> =>
          monitor.preview(),
      },
      ...(config.enableRepairTool
        ? [
            {
              name: "healthRepair",
              description:
                "Run one bounded Voltra ORM/index health pass and apply only strongly validated repairs. Returns continuation=true when additional bounded work remains.",
              outputTypeInfo: HEALTH_MCP_RESULT_TYPE_INFO_PACK,
              annotations: REPAIR_ANNOTATIONS,
              handler: async (): Promise<TypeInfoORMHealthMonitorRunResult> =>
                monitor.repair(),
            },
          ]
        : []),
    ],
  });
};
