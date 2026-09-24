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
  TypeInfoORMHealthFindingsOptions,
  TypeInfoORMHealthFindingsResult,
  TypeInfoORMHealthMonitor,
  TypeInfoORMHealthMonitorRunResult,
  TypeInfoORMHealthProgressResult,
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
      passNumber: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      structuredDocumentsProcessedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      textDocumentsProcessedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      structuredTypeNames: {
        type: "string",
        array: true,
        readonly: true,
        optional: false,
        tags: {
          validation: {
            emptyArrayIsValid: true,
          },
        },
      },
      textTypeNames: {
        type: "string",
        array: true,
        readonly: true,
        optional: false,
        tags: {
          validation: {
            emptyArrayIsValid: true,
          },
        },
      },
      cycleExaminedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      cycleOrphanFindingCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      cycleRepairedCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      cycleSuspiciousCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
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

const HEALTH_MCP_PROGRESS_TYPE_INFO_MAP: TypeInfoMap = {
  TypeInfoORMHealthProgressResult: {
    fields: {
      runId: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      status: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      repairMode: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
        possibleValues: ["preview", "apply"],
      },
      passCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      structuredComplete: {
        type: "boolean",
        array: false,
        readonly: true,
        optional: false,
      },
      textComplete: {
        type: "boolean",
        array: false,
        readonly: true,
        optional: false,
      },
      canonicalComplete: {
        type: "boolean",
        array: false,
        readonly: true,
        optional: false,
      },
      schemaReconcileComplete: {
        type: "boolean",
        array: false,
        readonly: true,
        optional: false,
      },
      structuredTypeNames: {
        type: "string",
        array: true,
        readonly: true,
        optional: false,
        tags: {
          validation: {
            emptyArrayIsValid: true,
          },
        },
      },
      textTypeNames: {
        type: "string",
        array: true,
        readonly: true,
        optional: false,
        tags: {
          validation: {
            emptyArrayIsValid: true,
          },
        },
      },
      canonicalTypeName: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      retentionPending: {
        type: "boolean",
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
      updatedAt: {
        type: "number",
        array: false,
        readonly: true,
        optional: true,
      },
    },
  },
};

const HEALTH_MCP_PROGRESS_OUTPUT_TYPE_INFO_PACK: TypeInfoPack = {
  entryTypeName: "TypeInfoORMHealthProgressResult",
  typeInfoMap: HEALTH_MCP_PROGRESS_TYPE_INFO_MAP,
};

const HEALTH_MCP_FINDINGS_TYPE_INFO_MAP: TypeInfoMap = {
  TypeInfoORMHealthFindingsOptions: {
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
      status: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      typeName: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      scope: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
    },
  },
  TypeInfoORMHealthFindingSummary: {
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: true,
        optional: false,
      },
      status: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      typeName: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      itemId: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      operation: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      scope: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      correlationId: {
        type: "string",
        array: false,
        readonly: true,
        optional: true,
      },
      count: {
        type: "number",
        array: false,
        readonly: true,
        optional: true,
      },
      value: {
        type: "number",
        array: false,
        readonly: true,
        optional: true,
      },
      createdAt: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      updatedAt: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      expiresAt: {
        type: "number",
        array: false,
        readonly: true,
        optional: true,
      },
    },
  },
  TypeInfoORMHealthFindingsResult: {
    fields: {
      examinedRecordCount: {
        type: "number",
        array: false,
        readonly: true,
        optional: false,
      },
      findings: {
        type: "string",
        typeReference: "TypeInfoORMHealthFindingSummary",
        array: true,
        readonly: true,
        optional: false,
        tags: {
          validation: {
            emptyArrayIsValid: true,
          },
        },
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

const HEALTH_MCP_FINDINGS_INPUT_TYPE_INFO_PACK: TypeInfoPack = {
  entryTypeName: "TypeInfoORMHealthFindingsOptions",
  typeInfoMap: HEALTH_MCP_FINDINGS_TYPE_INFO_MAP,
};

const HEALTH_MCP_FINDINGS_OUTPUT_TYPE_INFO_PACK: TypeInfoPack = {
  entryTypeName: "TypeInfoORMHealthFindingsResult",
  typeInfoMap: HEALTH_MCP_FINDINGS_TYPE_INFO_MAP,
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
  "status" | "progress" | "findings" | "preview" | "repair"
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
   * Normal Voltra route authorization copied onto each Health tool Route.
   *
   * Standard MCP descriptor/protocol routes remain public by default.
   */
  authConfig: RouteAuthConfig;
  /**
   * Expose the destructive `healthRepair` tool.
   *
   * Defaults to false so the endpoint exposes only status/preview behavior
   * unless the application explicitly opts into agent-triggered repair.
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
 * - `healthProgress` reads the active logical audit-cycle phase and recent type progress.
 * - `healthFindings` reads one bounded page of persisted findings with optional filters.
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
    tools: [
      {
        path: "healthStatus",
        authConfig: config.authConfig,
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
        path: "healthProgress",
        authConfig: config.authConfig,
        description:
          "Read the current logical Voltra Health audit-cycle progress, including completion phases, pass count, recently processed TypeInfo types, and whether retention still has background work.",
        outputTypeInfo: HEALTH_MCP_PROGRESS_OUTPUT_TYPE_INFO_PACK,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        handler: async (): Promise<TypeInfoORMHealthProgressResult> =>
          monitor.progress(),
      },
      {
        path: "healthFindings",
        authConfig: config.authConfig,
        description:
          "Read one bounded page of persisted Voltra Health findings. Optional status, typeName, and scope filters help inspect active or repaired issues without running maintenance.",
        inputTypeInfo: HEALTH_MCP_FINDINGS_INPUT_TYPE_INFO_PACK,
        outputTypeInfo: HEALTH_MCP_FINDINGS_OUTPUT_TYPE_INFO_PACK,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        handler: async (
          input: TypeInfoORMHealthFindingsOptions,
        ): Promise<TypeInfoORMHealthFindingsResult> => monitor.findings(input),
      },
      {
        path: "healthPreview",
        authConfig: config.authConfig,
        description:
          "Run one bounded, non-destructive Voltra ORM/index health pass. Reports orphaned indexes, schema drift, suspicious state, and retention cleanup. continuation=true only when the index/schema audit requires another run; retention backlog does not block audit completion.",
        outputTypeInfo: HEALTH_MCP_RESULT_TYPE_INFO_PACK,
        annotations: PREVIEW_ANNOTATIONS,
        handler: async (): Promise<TypeInfoORMHealthMonitorRunResult> =>
          monitor.preview(),
      },
      ...(config.enableRepairTool
        ? [
            {
              path: "healthRepair",
              authConfig: config.authConfig,
              description:
                "Run one bounded Voltra ORM/index health pass and apply only strongly validated repairs. Returns continuation=true only when additional index/schema audit work remains; retention cleanup continues opportunistically without blocking completion.",
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
