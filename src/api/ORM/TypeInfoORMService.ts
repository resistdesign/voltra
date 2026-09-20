/**
 * @packageDocumentation
 *
 * TypeInfo-driven ORM service. Configure with a type map and a driver resolver,
 * and optionally provide DAC and indexing integrations. The constructor validates
 * configuration once, and each call resolves drivers as needed.
 */
import {
  LiteralValue,
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
  TypeInfoMap,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  ERROR_MESSAGE_CONSTANTS,
  getErrorDescriptor,
  getNoErrorDescriptor,
  getValidityValue,
  RelationshipValidationType,
  TypeInfoValidationResults,
  validateTypeInfoValue,
  validateTypeOperationAllowed,
} from "../../common/TypeParsing/Validation";
import {
  ComparisonOperators,
  FieldCriterion,
  ListItemsConfig,
  ListItemsResults,
  ListRelationshipsConfig,
  LogicalOperators,
  SearchCriteria,
} from "../../common/SearchTypes";
import { validateSearchFields } from "../../common/SearchValidation";
import { validateRelationshipItem } from "../../common/ItemRelationships";
import {
  DeleteRelationshipResults,
  OperationGroup,
  RelationshipOperation,
  TypeInfoORMAPI,
  TypeInfoORMContext,
  TypeInfoORMServiceError,
  TypeInfoORMUpdateConfig,
  TypeInfoORMUpdateOperators,
} from "../../common/TypeInfoORM";
import {
  DataItemDBDriver,
  IndexingRelationshipDriver,
  ItemRelationshipDBDriver,
} from "./drivers";
import {
  removeNonexistentFieldsFromDataItem,
  removeNonexistentFieldsFromSelectedFields,
  removeTypeReferenceFieldsFromDataItem,
  removeTypeReferenceFieldsFromSelectedFields,
  removeUnselectedFieldsFromDataItem,
} from "../../common/TypeParsing/Utils";
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
  ItemRelationshipInfoIdentifyingKeys,
  ItemRelationshipInfoKeys,
  ItemRelationshipInfoType,
  ItemRelationshipOriginatingItemInfo,
} from "../../common/ItemRelationshipInfoTypes";
import {
  DACAccessResult,
  DACDataItemResourceAccessResultMap,
  DACRole,
  getResourceAccessByDACRole,
  mergeDACAccessResults,
} from "../DataAccessControl";
import {
  getDACRoleHasAccessToDataItem,
  getItemRelationshipDACResourcePath,
  mergeDACDataItemResourceAccessResultMaps,
} from "./DACUtils";
import { executeDriverListItems } from "./ListItemUtils";
import {
  indexDocument,
  removeDocument,
  replaceFullTextDocument as replaceFullTextDocumentIndex,
} from "../Indexing/API";
import { qualifyIndexField } from "../Indexing/fieldQualification";
import type { IndexMutationCoordinator } from "../Indexing/ddb/IndexMutationCoordinator";
import {
  searchIndex,
  IndexQueryError,
  IndexQueryErrorCode,
  type IndexBackend,
  type IndexedFieldCapabilities,
  type IndexedFieldsByType,
  type IndexExpression,
  type IndexSearchDiagnostics,
  type IndexSearchLimits,
} from "../Indexing/query";
import { normalizeDocId } from "../Indexing/docId";
import type { StructuredDocFieldsRecord } from "../Indexing/structured/StructuredIndexRecords";
import type {
  StructuredDocumentListOptions,
  StructuredDocumentPage,
} from "../Indexing/structured/SearchStructured";
import { StructuredIndexVersionMismatchError } from "../Indexing/structured/StructuredWriter";
import type {
  TextIndexDocumentListOptions,
  TextIndexDocumentPage,
} from "../Indexing/Types";
import type { WhereValue } from "../Indexing/structured/Types";
import { STRUCTURED_OPTIONAL_ORDER_REQUIRES_OCCUPANCY } from "../Indexing/structured/Types";
import type { StructuredStringTokenizerConfig } from "../Indexing/structured/StructuredStringLike";
import type {
  StructuredOccupancyFieldMap,
  StructuredWriteContext,
} from "../Indexing/structured/StructuredOccupancy";
import {
  doesTypeInfoDataItemMatchSearchCriteria,
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../common/SearchUtils";
import { DATA_ITEM_DB_DRIVER_ERRORS } from "./drivers/common";
import { criteriaToIndexExpression } from "./indexing/criteriaToIndexExpression";
import type { RelationalBackend } from "./drivers/IndexingRelationshipDriver";

/**
 * Strip a relationship item down to its identifying keys.
 * @returns Relationship item containing only identifying fields.
 * */
export const cleanRelationshipItem = (
  /**
   * Relationship item to normalize.
   */
  relationshipItem: BaseItemRelationshipInfo,
): BaseItemRelationshipInfo => {
  const relItemKeys = Object.values(ItemRelationshipInfoKeys);
  const cleanedItem: Partial<BaseItemRelationshipInfo> = {};

  for (const rIK of relItemKeys) {
    cleanedItem[rIK] = relationshipItem[rIK];
  }

  return cleanedItem as BaseItemRelationshipInfo;
};

type RequiredDataItemDBDriverMethodName =
  | "createItem"
  | "readItem"
  | "updateItem"
  | "deleteItem"
  | "listItems";

/**
 * Wrap a driver method to attach extra fields to thrown errors.
 * @returns Wrapped driver method with extended error data.
 * */
export const getDriverMethodWithModifiedError = <
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
  DriverMethodNameType extends RequiredDataItemDBDriverMethodName,
  MethodType extends (
    ...args: any[]
  ) => any = DataItemDBDriver<
    ItemType,
    UniquelyIdentifyingFieldName
  >[DriverMethodNameType],
>(
  /**
   * Extra fields to attach to thrown errors.
   */
  extendedData: Record<any, any>,
  /**
   * Driver instance containing the method.
   */
  driver: DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>,
  /**
   * Driver method name to wrap.
   */
  driverMethodName: DriverMethodNameType,
): MethodType =>
  ((...args: Parameters<MethodType>): Promise<any> => {
    try {
      return (driver[driverMethodName] as (...args: any[]) => Promise<any>)(
        ...(args as Parameters<MethodType>),
      ) as Promise<any>;
    } catch (error: any) {
      throw {
        ...(error as Record<any, any>),
        ...extendedData,
      };
    }
  }) as MethodType;

/**
 * The configuration for the TypeInfoORMService DAC features.
 * */
export type TypeInfoORMDACConfig = {
  /**
   * DAC path prefix for item resources.
   *
   * This prefix is prepended to canonical item paths before evaluating
   * DAC constraints.
   */
  itemResourcePathPrefix: LiteralValue[];
  /**
   * DAC path prefix for relationship resources.
   *
   * This prefix is prepended to canonical relationship paths before
   * evaluating DAC constraints.
   */
  relationshipResourcePathPrefix: LiteralValue[];
  /**
   * Optional resolver for owner/tenant prefix applied to item resource paths.
   *
   * When present, the returned prefix is inserted after
   * `itemResourcePathPrefix` and before the canonical item path segments.
   *
   * Relationship create/delete operations also use this prefix to validate
   * endpoint ownership for both the `from` and `to` items.
   */
  getOwnerPrefix?: (
    typeName: string,
    primaryFieldValue: LiteralValue,
  ) => Promise<LiteralValue[] | undefined>;
  /**
   * Lookup helper used to resolve roles by id.
   */
  getDACRoleById: (id: string) => Promise<DACRole>;
};

/**
 * Configuration for TypeInfoORM indexing integrations.
 */
export type TypeInfoORMIndexingConfig = {
  /** Shared scope that combines compatible derived writes across backends. */
  mutationCoordinator?: Pick<IndexMutationCoordinator, "run">;
  /** Singular logical backend composed from specialized physical capabilities. */
  backend: IndexBackend;
  /** TypeInfo-derived source of truth for planning and mutation. */
  fieldsByType?: IndexedFieldsByType;
  /** Shared text/value tokenizer behavior participating in cursor identity. */
  tokenizer?: Partial<StructuredStringTokenizerConfig>;
  /** Permit canonical scan fallback for genuinely unindexable criteria. */
  allowFullScanFallback?: boolean;
  /**
   * Relationship indexing configuration.
   */
  relations?: {
    /**
     * Backend used for relationship indexing.
     */
    backend: RelationalBackend;
    /**
     * Resolver for relation name from type/field.
     */
    relationNameFor: (
      fromTypeName: string,
      fromTypeFieldName: string,
    ) => string;
    /**
     * Optional encoder for entity ids.
     */
    encodeEntityId?: (typeName: string, primaryFieldValue: string) => string;
    /**
     * Optional decoder for entity ids.
     */
    decodeEntityId?: (typeName: string, entityId: string) => string;
  };
  /**
   * Optional search limits for indexing queries.
   */
  limits?: Partial<IndexSearchLimits>;
  /**
   * Optional observability hooks for indexing/routing diagnostics.
   */
  observability?: {
    /**
     * Called when list routing chooses a query execution path.
     */
    onListRoutingDecision?: (event: {
      typeName: string;
      path: "indexed" | "fullScanCompare" | "canonicalDriverList";
      reason:
        | "indexedExpression"
        | "noCriteria"
        | "criteriaWithoutIndexedPath"
        | "indexedPathFailedOrUnsupported";
      criteriaCount: number;
      plan?: IndexSearchDiagnostics;
    }) => void;
    /**
     * Called when unified indexing writes/removes document entries.
     */
    onIndexWrite?: (event: {
      typeName: string;
      docId: string;
      action: "upsert" | "remove";
      fieldCount: number;
    }) => void;
  };
};

/**
 * Public TypeInfoORM operations exposed to lightweight observability hooks.
 */
export type TypeInfoORMOperationName =
  | "createRelationship"
  | "deleteRelationship"
  | "listRelationships"
  | "listRelatedItems"
  | "create"
  | "read"
  | "update"
  | "delete"
  | "list";

/**
 * Timing/result metadata emitted after one public TypeInfoORM operation.
 *
 * Payload values intentionally exclude item contents, criteria values, and DAC
 * context so health instrumentation does not accidentally persist application
 * data or authorization material.
 */
export type TypeInfoORMOperationObservation = {
  /** Public ORM operation that completed or failed. */
  operation: TypeInfoORMOperationName;
  /** Associated TypeInfo type when it can be determined from the call. */
  typeName?: string;
  /** Millisecond timestamp when the operation began. */
  startedAt: number;
  /** Total operation duration in milliseconds. */
  durationMs: number;
  /** Whether the operation completed successfully. */
  success: boolean;
  /** Number of returned items for list-style results, when available. */
  resultCount?: number;
};

/** Callback for receiving TypeInfoORM operation observations. */
export type TypeInfoORMOperationObserver = (
  event: TypeInfoORMOperationObservation,
) => void | Promise<void>;

/**
 * Type-level metadata exposed to Health and maintenance tooling.
 */
export type TypeInfoORMIndexMaintenanceTypeDescriptor = {
  /** TypeInfo type name. */
  typeName: string;
  /** Primary field used by the canonical data driver. */
  primaryField: string;
  /** Prefix shared by every persisted qualified index field for this type. */
  qualifiedFieldPrefix: string;
  /** Deterministic identity for the current index-relevant TypeInfo schema. */
  indexFingerprint: string;
  /** Current structured exact/membership/range fields for this type. */
  structuredFields: string[];
  /** Current full-text fields for this type. */
  textFields: string[];
};

/** Options for one bounded TypeInfo index-schema reconciliation page. */
export type TypeInfoORMReconcileStoredTypeIndexesPageConfig = {
  /** Prior descriptor captured before the schema changed. */
  previousDescriptor?: TypeInfoORMIndexMaintenanceTypeDescriptor;
  /** Maximum canonical items to reconcile in this page. */
  itemsPerPage?: number;
  /** Opaque canonical-driver continuation token. */
  cursor?: string;
};

/** Result of one bounded TypeInfo index-schema reconciliation page. */
export type TypeInfoORMReconcileStoredTypeIndexesPageResult = {
  /** Canonical items reconciled in this page. */
  processedCount: number;
  /** Opaque continuation token when more canonical items remain. */
  cursor?: string;
};

/** Options for removed-Type index cleanup. */
export type TypeInfoORMRemovedTypeIndexCleanupConfig = {
  /** Prior TypeInfo descriptor for the removed type. */
  previousDescriptor: TypeInfoORMIndexMaintenanceTypeDescriptor;
  /** Audited structured mirror version, when cleaning structured state. */
  structuredVersion?: number;
  /** Persisted text fields observed for this id. */
  textIndexFields?: string[];
};

/** Result of one removed-Type index cleanup attempt. */
export type TypeInfoORMRemovedTypeIndexCleanupResult = {
  /** Outcome of the guarded index-only cleanup. */
  status: "cleaned" | "indexChanged" | "maintenanceUnsupported";
  /** Whether any index mutation was attempted. */
  cleanupAttempted: boolean;
};

/**
 * Result of a canonical-item maintenance verification read.
 */
export type TypeInfoORMIndexMaintenanceVerification = {
  /** Whether the canonical item exists. */
  exists: boolean;
  /** Read consistency used for the verification. */
  consistency: "strong" | "bestEffort";
  /** Canonical item when it exists. */
  item?: Partial<TypeInfoDataItem>;
};

/**
 * Options for safe orphan index cleanup.
 */
export type TypeInfoORMOrphanIndexCleanupConfig = {
  /**
   * Structured document mirror version observed by the auditing caller.
   *
   * When supplied, structured cleanup is compare-and-swap guarded against
   * index writes that happen after the audit.
   */
  structuredVersion?: number;
  /**
   * Persisted full-text fields observed by the audit.
   *
   * This supports cleanup of fields removed from the current TypeInfo schema.
   * Every supplied field must still belong to the requested type namespace.
   */
  textIndexFields?: string[];
};

/**
 * Result of one type+id orphan cleanup attempt.
 */
export type TypeInfoORMOrphanIndexCleanupResult = {
  /** Outcome of the guarded cleanup attempt. */
  status:
    | "cleaned"
    | "canonicalExists"
    | "concurrentCanonicalRestored"
    | "indexChanged"
    | "strongConsistencyUnavailable"
    | "maintenanceUnsupported";
  /** Whether any index cleanup write was attempted. */
  cleanupAttempted: boolean;
  /** Whether current canonical state was reindexed during race recovery. */
  canonicalReindexed: boolean;
};

/**
 * Optional field overrides for manual indexing maintenance operations.
 */
export type TypeInfoORMManualIndexingConfig = {
  /**
   * Explicit field name(s) to target instead of configured capabilities.
   *
   * Supply the previous field set when cleaning up after a schema/config change.
   */
  indexFields?: string[];
};

/**
 * Optional field overrides for manual index replacement/reindex operations.
 */
export type TypeInfoORMReplaceIndexingConfig = {
  /**
   * Indexed field name(s) to remove from the previous snapshot.
   */
  previousIndexFields?: string[];
  /**
   * Indexed field name(s) to add for the next snapshot.
   */
  nextIndexFields?: string[];
};

/**
 * Options for reindexing a stored item from the backing driver.
 */
export type TypeInfoORMReindexStoredItemConfig =
  TypeInfoORMReplaceIndexingConfig & {
    /**
     * Optional previous snapshot to remove before indexing the current stored item.
     */
    previousItem?: Partial<TypeInfoDataItem>;
  };

/**
 * Options for reindexing all currently stored items of a type.
 */
export type TypeInfoORMReindexStoredTypeConfig =
  TypeInfoORMReplaceIndexingConfig & {
    /**
     * Maximum number of items to load per driver page.
     */
    itemsPerPage?: number;
    /**
     * Optional previous snapshots keyed by primary field value.
     *
     * Use this when a schema/config change requires cleanup of previously indexed
     * fields before the current item is reindexed.
     */
    previousItemsByPrimaryField?: Record<string, Partial<TypeInfoDataItem>>;
  };

/**
 * Results from reindexing all currently stored items of a type.
 */
export type TypeInfoORMReindexStoredTypeResults = {
  /**
   * Number of stored items that were reindexed.
   */
  processedCount: number;
};

/**
 * The basis for the configuration for the TypeInfoORMService.
 * */
export type BaseTypeInfoORMServiceConfig = {
  /**
   * Type info map used to validate and shape items.
   */
  typeInfoMap: TypeInfoMap;
  /**
   * Driver resolver for item types.
   */
  getDriver: (typeName: string) => DataItemDBDriver<any, any>;
  /**
   * Optional relationship driver resolver.
   */
  getRelationshipDriver?: (
    typeName: string,
    fieldName: string,
  ) => ItemRelationshipDBDriver;
  /**
   * Optional indexing configuration.
   */
  indexing?: TypeInfoORMIndexingConfig;
  /**
   * Optional ORM-wide observability hooks.
   */
  observability?: {
    /**
     * Called after public ORM operations complete or fail.
     *
     * Hook failures are isolated and never alter ORM behavior.
     */
    onOperation?: TypeInfoORMOperationObserver;
  };
  /**
   * Optional relationship cleanup hook on delete.
   */
  createRelationshipCleanupItem?: (
    relationshipOriginatingItem: ItemRelationshipOriginatingItemInfo,
  ) => Promise<void>;
  /**
   * Optional custom validators by type/field.
   */
  customValidators?: CustomTypeInfoFieldValidatorMap;
};

/**
 * The options determining the usage of DAC features in a {@link TypeInfoORMServiceConfig}.
 * */
export type TypeInfoORMServiceDACOptions =
  | {
      useDAC: true;
      dacConfig: TypeInfoORMDACConfig;
    }
  | {
      useDAC: false;
    };

/**
 * The configuration for the TypeInfoORMService, including DAC features.
 * */
export type TypeInfoORMServiceConfig = BaseTypeInfoORMServiceConfig &
  TypeInfoORMServiceDACOptions;

/**
 * TypeInfo-driven ORM service with optional DAC and indexing integrations.
 */
export class TypeInfoORMService implements TypeInfoORMAPI {
  protected dacRoleCache: Record<string, DACRole> = {};
  protected indexingRelationshipDriver?: IndexingRelationshipDriver;
  protected operationObservers = new Set<TypeInfoORMOperationObserver>();

  /**
   * Emit a public ORM operation observation without impacting runtime behavior.
   */
  protected emitOperationObservation = async (
    event: TypeInfoORMOperationObservation,
  ): Promise<void> => {
    for (const observer of this.operationObservers) {
      try {
        await observer(event);
      } catch (_error) {
        // Observability hooks must never alter ORM behavior.
      }
    }
  };

  /**
   * Subscribe to public ORM operation observations.
   *
   * This allows optional systems such as Health to attach to an already
   * configured ORM instance without rebuilding its application configuration.
   *
   * @param observer Observation callback.
   * @returns Function that removes the observer.
   */
  addOperationObserver = (
    observer: TypeInfoORMOperationObserver,
  ): (() => void) => {
    this.operationObservers.add(observer);

    return () => {
      this.operationObservers.delete(observer);
    };
  };

  /**
   * Resolve a non-sensitive TypeInfo type name from a public ORM argument list.
   */
  protected getObservedOperationTypeName = (
    args: unknown[],
  ): string | undefined => {
    const first = args[0];

    if (typeof first === "string") {
      return first;
    }

    if (typeof first !== "object" || first === null) {
      return undefined;
    }

    const record = first as Record<string, unknown>;
    const typeName = record.typeName ?? record.fromTypeName;

    return typeof typeName === "string" ? typeName : undefined;
  };

  /**
   * Wrap one public ORM method with lightweight duration/result observation.
   */
  protected wrapObservedOperation = <Args extends unknown[], Result>(
    operation: TypeInfoORMOperationName,
    target: (...args: Args) => Promise<Result>,
  ): ((...args: Args) => Promise<Result>) =>
    async (...args: Args): Promise<Result> => {
      const startedAt = Date.now();

      try {
        const result = await target(...args);
        const resultCount =
          typeof result === "object" &&
          result !== null &&
          "items" in result &&
          Array.isArray((result as { items?: unknown }).items)
            ? (result as { items: unknown[] }).items.length
            : undefined;

        await this.emitOperationObservation({
          operation,
          typeName: this.getObservedOperationTypeName(args),
          startedAt,
          durationMs: Math.max(0, Date.now() - startedAt),
          success: true,
          ...(resultCount !== undefined ? { resultCount } : {}),
        });

        return result;
      } catch (error) {
        await this.emitOperationObservation({
          operation,
          typeName: this.getObservedOperationTypeName(args),
          startedAt,
          durationMs: Math.max(0, Date.now() - startedAt),
          success: false,
        });
        throw error;
      }
    };

  /**
   * Emit list routing decision observability events without impacting runtime behavior.
   */
  protected emitListRoutingDecision = (
    /**
     * Type being listed.
     */
    typeName: string,
    /**
     * Selected routing path.
     */
    path: "indexed" | "fullScanCompare" | "canonicalDriverList",
    /**
     * Why this path was selected.
     */
    reason:
      | "indexedExpression"
      | "noCriteria"
      | "criteriaWithoutIndexedPath"
      | "indexedPathFailedOrUnsupported",
    /**
     * Number of criteria considered.
     */
    criteriaCount: number,
    plan?: IndexSearchDiagnostics,
  ): void => {
    const hook = this.config.indexing?.observability?.onListRoutingDecision;

    if (!hook) {
      return;
    }

    try {
      hook({
        typeName,
        path,
        reason,
        criteriaCount,
        plan,
      });
    } catch (_error) {
      // Observability hooks must never alter ORM behavior.
    }
  };

  /**
   * Emit structured index write observability events without impacting behavior.
   */
  protected emitIndexWrite = (
    /**
     * Type being indexed.
     */
    typeName: string,
    /**
     * Indexed document id.
     */
    docId: string,
    /**
     * Structured indexing action.
     */
    action: "upsert" | "remove",
    /**
     * Number of indexed fields in the write payload.
     */
    fieldCount: number,
  ): void => {
    const hook = this.config.indexing?.observability?.onIndexWrite;

    if (!hook) {
      return;
    }

    try {
      hook({ typeName, docId, action, fieldCount });
    } catch (_error) {
      // Observability hooks must never alter ORM behavior.
    }
  };

  /**
   * @param config ORM service configuration.
   */
  constructor(protected config: TypeInfoORMServiceConfig) {
    if (!config.getDriver) {
      throw new Error(TypeInfoORMServiceError.NO_DRIVERS_SUPPLIED);
    }

    if (!config.getRelationshipDriver && !config.indexing?.relations) {
      throw new Error(TypeInfoORMServiceError.NO_RELATIONSHIP_DRIVERS_SUPPLIED);
    }

    if (config.observability?.onOperation) {
      this.operationObservers.add(config.observability.onOperation);
    }

    this.createRelationship = this.wrapObservedOperation(
      "createRelationship",
      this.createRelationship,
    );
    this.deleteRelationship = this.wrapObservedOperation(
      "deleteRelationship",
      this.deleteRelationship,
    );
    this.listRelationships = this.wrapObservedOperation(
      "listRelationships",
      this.listRelationships,
    );
    this.listRelatedItems = this.wrapObservedOperation(
      "listRelatedItems",
      this.listRelatedItems,
    );
    this.create = this.wrapObservedOperation("create", this.create);
    this.read = this.wrapObservedOperation("read", this.read);
    this.update = this.wrapObservedOperation("update", this.update);
    this.delete = this.wrapObservedOperation("delete", this.delete);
    this.list = this.wrapObservedOperation("list", this.list);
  }

  protected resolveAccessingRole = async (
    context?: TypeInfoORMContext,
  ): Promise<DACRole | undefined> => {
    const { useDAC } = this.config;

    if (!useDAC) {
      return undefined;
    }

    const { dacConfig } = this.config;

    if (!context) {
      throw new Error(TypeInfoORMServiceError.MISSING_ACCESSING_ROLE);
    }

    const rootRole = await dacConfig.getDACRoleById(context.accessingRoleId);

    if (!rootRole) {
      throw new Error(TypeInfoORMServiceError.MISSING_ACCESSING_ROLE);
    }

    return rootRole;
  };

  protected getItemDACValidation = async (
    /**
     * Item to evaluate for access.
     */
    item: Partial<TypeInfoDataItem>,
    /**
     * Type name for the item.
     */
    typeName: string,
    /**
     * Operation being evaluated.
     */
    typeOperation: TypeOperation,
    /**
     * Optional access context for the call.
     */
    context?: TypeInfoORMContext,
  ): Promise<DACDataItemResourceAccessResultMap> => {
    const { useDAC } = this.config;

    if (useDAC) {
      const typeInfo = this.getTypeInfo(typeName);
      const { dacConfig } = this.config;
      const { itemResourcePathPrefix, getDACRoleById, getOwnerPrefix } =
        dacConfig;
      const accessingRole = await this.resolveAccessingRole(context);
      const { primaryField } = typeInfo;
      const primaryFieldValue =
        typeof primaryField === "string" &&
        typeof item === "object" &&
        item !== null
          ? (item[primaryField as keyof TypeInfoDataItem] as LiteralValue)
          : undefined;
      const ownerPrefix =
        getOwnerPrefix && typeof primaryFieldValue !== "undefined"
          ? await getOwnerPrefix(typeName, primaryFieldValue)
          : undefined;
      const itemPrefix = [...itemResourcePathPrefix, ...(ownerPrefix ?? [])];

      const [
        typeOperationAccess,
        allItemOperationsAccess,
        allOperationsAccess,
      ] = await Promise.all([
        getDACRoleHasAccessToDataItem(
          itemPrefix,
          typeOperation,
          typeName,
          item,
          typeInfo,
          accessingRole as DACRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getDACRoleHasAccessToDataItem(
          itemPrefix,
          OperationGroup.ALL_ITEM_OPERATIONS,
          typeName,
          item,
          typeInfo,
          accessingRole as DACRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getDACRoleHasAccessToDataItem(
          itemPrefix,
          OperationGroup.ALL_OPERATIONS,
          typeName,
          item,
          typeInfo,
          accessingRole as DACRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
      ]);

      return mergeDACDataItemResourceAccessResultMaps(
        typeOperationAccess,
        allItemOperationsAccess,
        allOperationsAccess,
      );
    } else {
      return {
        allowed: true,
        denied: false,
        fieldsResources: {},
      };
    }
  };

  protected getRelationshipDACValidation = async (
    /**
     * Relationship to evaluate for access.
     */
    itemRelationship: BaseItemRelationshipInfo,
    /**
     * Relationship operation being evaluated.
     */
    relationshipOperation: RelationshipOperation,
    /**
     * Optional access context for the call.
     */
    context?: TypeInfoORMContext,
    /**
     * Optional relationship resource path prefix override.
     */
    relationshipPrefixOverride?: LiteralValue[],
  ): Promise<DACAccessResult> => {
    const { useDAC } = this.config;

    if (useDAC) {
      const { dacConfig } = this.config;
      const { relationshipResourcePathPrefix, getDACRoleById } = dacConfig;
      const effectivePrefix =
        relationshipPrefixOverride ?? relationshipResourcePathPrefix;
      const accessingRole = await this.resolveAccessingRole(context);

      const [
        operationAccess,
        allRelationshipOperationsAccess,
        allOperationsAccess,
      ] = await Promise.all([
        getResourceAccessByDACRole(
          getItemRelationshipDACResourcePath(
            effectivePrefix,
            relationshipOperation,
            itemRelationship,
          ),
          accessingRole as DACRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getResourceAccessByDACRole(
          getItemRelationshipDACResourcePath(
            effectivePrefix,
            OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
            itemRelationship,
          ),
          accessingRole as DACRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getResourceAccessByDACRole(
          getItemRelationshipDACResourcePath(
            effectivePrefix,
            OperationGroup.ALL_OPERATIONS,
            itemRelationship,
          ),
          accessingRole as DACRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
      ]);

      return mergeDACAccessResults(
        operationAccess,
        allRelationshipOperationsAccess,
        allOperationsAccess,
      );
    } else {
      return {
        allowed: true,
        denied: false,
      };
    }
  };

  protected getRelationshipEndpointDACValidation = async (
    relationshipItem: BaseItemRelationshipInfo,
    relationshipOperation: RelationshipOperation,
    relatedTypeName: string,
    context?: TypeInfoORMContext,
  ): Promise<DACAccessResult> => {
    const { useDAC } = this.config;

    if (!useDAC) {
      return {
        allowed: true,
        denied: false,
      };
    }

    const { dacConfig } = this.config;
    const { relationshipResourcePathPrefix, getOwnerPrefix } = dacConfig;

    if (!getOwnerPrefix) {
      return {
        allowed: true,
        denied: false,
      };
    }

    const { fromTypeName, fromTypePrimaryFieldValue, toTypePrimaryFieldValue } =
      relationshipItem;
    const [fromPrefix, toPrefix] = await Promise.all([
      getOwnerPrefix(fromTypeName, fromTypePrimaryFieldValue),
      getOwnerPrefix(relatedTypeName, toTypePrimaryFieldValue),
    ]);

    const fromAccess = await this.getRelationshipDACValidation(
      relationshipItem,
      relationshipOperation,
      context,
      [...relationshipResourcePathPrefix, ...(fromPrefix ?? [])],
    );
    const toAccess = await this.getRelationshipDACValidation(
      relationshipItem,
      relationshipOperation,
      context,
      [...relationshipResourcePathPrefix, ...(toPrefix ?? [])],
    );

    return {
      allowed: fromAccess.allowed && toAccess.allowed,
      denied: fromAccess.denied || toAccess.denied,
    };
  };

  protected getWrappedDriverWithExtendedErrorData = <
    ItemType extends TypeInfoDataItem,
    UniquelyIdentifyingFieldName extends keyof ItemType,
  >(
    /**
     * Driver instance to wrap.
     */
    driver: DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>,
    /**
     * Extra fields to attach to thrown errors.
     */
    extendedData: Record<any, any>,
  ): DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName> => {
    const driverMethodList: RequiredDataItemDBDriverMethodName[] = [
      "createItem",
      "readItem",
      "updateItem",
      "deleteItem",
      "listItems",
    ];
    const driverWrapper: DataItemDBDriver<any, any> = {} as DataItemDBDriver<
      any,
      any
    >;

    for (const dM of driverMethodList) {
      driverWrapper[dM] = getDriverMethodWithModifiedError(
        extendedData,
        driver,
        dM,
      );
    }

    return driverWrapper;
  };

  protected getDriverInternal = (
    /**
     * Type name used to resolve the driver.
     */
    typeName: string,
  ): DataItemDBDriver<any, any> => {
    const driver = this.config.getDriver(typeName);

    if (!driver) {
      throw new Error(TypeInfoORMServiceError.INVALID_DRIVER);
    }

    return this.getWrappedDriverWithExtendedErrorData(driver, { typeName });
  };

  protected getRelationshipDriverInternal = (
    /**
     * Type name used to resolve the relationship driver.
     */
    typeName: string,
    /**
     * Field name used to resolve the relationship driver.
     */
    fieldName: string,
  ): ItemRelationshipDBDriver => {
    if (!this.config.getRelationshipDriver) {
      throw new Error(TypeInfoORMServiceError.NO_RELATIONSHIP_DRIVERS_SUPPLIED);
    }

    const driver = this.config.getRelationshipDriver(typeName, fieldName);

    if (!driver) {
      throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP_DRIVER);
    }

    return this.getWrappedDriverWithExtendedErrorData(driver, {
      typeName,
      fieldName,
    });
  };

  /**
   * @returns Indexing relationship driver for relation indexing.
   */
  /**
   * @returns Indexing relationship driver for relation indexing.
   */
  protected getIndexingRelationshipDriverInternal =
    (): IndexingRelationshipDriver => {
      if (!this.config.indexing?.relations) {
        throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP_DRIVER);
      }

      if (!this.indexingRelationshipDriver) {
        this.indexingRelationshipDriver = new IndexingRelationshipDriver(
          this.config.indexing.relations,
        );
      }

      return this.indexingRelationshipDriver;
    };

  /**
   * @param typeName Type name to resolve.
   * @returns Type info for the requested type.
   */
  /**
   * @param typeName Type name to resolve.
   * @returns Type info for the requested type.
   */
  protected getTypeInfo = (typeName: string): TypeInfo => {
    const typeInfo = this.config.typeInfoMap[typeName];

    if (!typeInfo) {
      throw {
        message: TypeInfoORMServiceError.INVALID_TYPE_INFO,
        typeName,
      };
    } else {
      const { primaryField } = typeInfo;

      if (typeof primaryField === "undefined") {
        throw {
          message: TypeInfoORMServiceError.TYPE_INFO_MISSING_PRIMARY_FIELD,
          typeName,
        };
      }
    }

    return typeInfo;
  };

  /** Resolve all configured field capabilities for a type. */
  protected getIndexedFieldCapabilities = (
    typeName: string,
  ): Record<string, IndexedFieldCapabilities> =>
    this.config.indexing?.fieldsByType?.[typeName] ?? {};

  /** Resolve deterministic, deduplicated fields for mutation operations. */
  protected resolveIndexFields = (
    typeName: string,
    override?: string[],
  ): string[] =>
    Array.from(
      new Set(
        (override ?? Object.keys(this.getIndexedFieldCapabilities(typeName)))
          .map((field) => field.trim())
          .filter(Boolean),
      ),
    ).sort();

  /** Resolve one globally ordered value capability. */
  protected resolveIndexOrderBy = (
    typeName: string,
    sortFields: ListItemsConfig["sortFields"],
  ): { field: string; reverse?: boolean; optional?: boolean } | undefined => {
    if (!sortFields?.length) {
      return undefined;
    }
    if (sortFields.length !== 1 || !sortFields[0].field) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_COMBINATION,
        typeName,
      };
    }

    const { field, reverse } = sortFields[0];
    const capability = this.getIndexedFieldCapabilities(typeName)[field];
    if (!capability?.range) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_COMBINATION,
        typeName,
        fieldName: field,
      };
    }
    return {
      field: qualifyIndexField(typeName, capability.field ?? field),
      reverse,
      optional: capability.optional,
    };
  };

  /**
   * @returns Encoded cursor for full-scan compare pagination.
   */
  protected encodeFullScanCompareCursor = (
    /**
     * Next offset in filtered/sorted results.
     */
    offset: number,
  ): string => JSON.stringify({ fullScanCompareOffset: offset });

  /**
   * @returns Decoded offset for full-scan compare pagination.
   */
  protected decodeFullScanCompareCursor = (
    /**
     * Cursor from list config.
     */
    cursor?: string,
  ): number => {
    if (!cursor) {
      return 0;
    }

    try {
      const parsed = JSON.parse(cursor) as { fullScanCompareOffset?: number };
      const offset = parsed.fullScanCompareOffset;

      if (!Number.isFinite(offset) || (offset as number) < 0) {
        throw new Error("Invalid full scan cursor offset");
      }

      return offset as number;
    } catch (_error) {
      throw {
        message: DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CURSOR,
        cursor,
      };
    }
  };

  /**
   * Execute a criteria list via full scan + in-memory compare.
   *
   * This is the universal fallback strategy for criteria/operators that are not
   * supported by indexed query planners.
   *
   * @returns List results with cursor.
   */
  protected async listByFullScanAndCompare(
    /**
     * Type name to list.
     */
    typeName: string,
    /**
     * Original list config.
     */
    config: ListItemsConfig,
    /**
     * Selected fields for cleaned response.
     */
    cleanSelectedFields: (keyof TypeInfoDataItem)[] | undefined,
    /**
     * Whether DAC checks are enabled.
     */
    useDAC: boolean,
    /**
     * Optional request context.
     */
    context?: TypeInfoORMContext,
  ): Promise<ListItemsResults<Partial<TypeInfoDataItem>>> {
    const driver = this.getDriverInternal(typeName);
    const { criteria, sortFields, itemsPerPage = 10, cursor } = config;
    const allItems: Partial<TypeInfoDataItem>[] = [];
    let scanCursor: string | undefined;

    while (true) {
      const page = await driver.listItems({
        itemsPerPage: 250,
        cursor: scanCursor,
      });

      allItems.push(...(page.items ?? []));

      if (!page.cursor || page.cursor === scanCursor) {
        break;
      }

      scanCursor = page.cursor;
    }

    const filtered = criteria
      ? (getFilterTypeInfoDataItemsBySearchCriteria(
          criteria,
          allItems as TypeInfoDataItem[],
          typeName,
          this.config.typeInfoMap,
        ) as TypeInfoDataItem[])
      : (allItems as TypeInfoDataItem[]);
    const sorted = getSortedItems(sortFields, filtered);
    let index = this.decodeFullScanCompareCursor(cursor);
    const cleanedItems: Partial<TypeInfoDataItem>[] = [];

    while (index < sorted.length && cleanedItems.length < itemsPerPage) {
      const item = sorted[index] as Partial<TypeInfoDataItem>;
      index += 1;

      let fieldsResources: Record<string, DACAccessResult> | undefined;

      if (useDAC) {
        const {
          allowed: readAllowed,
          denied: readDenied,
          fieldsResources: nextFieldsResources = {},
        } = await this.getItemDACValidation(
          item,
          typeName,
          TypeOperation.READ,
          context,
        );
        const listDenied = readDenied || !readAllowed;

        if (listDenied) {
          continue;
        }

        fieldsResources = nextFieldsResources;
      }

      cleanedItems.push(
        this.getCleanItem(typeName, item, fieldsResources, cleanSelectedFields),
      );
    }

    return {
      items: cleanedItems,
      cursor:
        index < sorted.length
          ? this.encodeFullScanCompareCursor(index)
          : undefined,
    };
  }

  /**
   * @param value Value to check.
   * @returns True when the value is a supported structured value.
   */
  protected isIndexValue = (value: unknown): value is WhereValue =>
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean";

  /**
   * @returns Structured fields record for indexing.
   */
  protected buildIndexValueFields = (
    /**
     * Type name for field mapping.
     */
    typeName: string,
    /**
     * Item to extract structured fields from.
     */
    item: Partial<TypeInfoDataItem>,
  ): StructuredDocFieldsRecord => {
    const typeInfo = this.getTypeInfo(typeName);
    const capabilities = this.getIndexedFieldCapabilities(typeName);
    const withoutRefs = removeTypeReferenceFieldsFromDataItem(typeInfo, item);
    const fields: StructuredDocFieldsRecord = {};

    for (const [fieldName, value] of Object.entries(withoutRefs)) {
      const capability = capabilities[fieldName];
      if (
        !capability ||
        (!capability.exact && !capability.membership && !capability.range)
      ) {
        continue;
      }

      if (typeof value === "undefined") {
        continue;
      }

      const mappedField = capability.field ?? fieldName;
      const qualifiedField = qualifyIndexField(typeName, mappedField);

      if (Array.isArray(value)) {
        const filtered = value.filter((entry) => this.isIndexValue(entry));
        if (filtered.length > 0) {
          fields[qualifiedField] = filtered as WhereValue[];
        }
        continue;
      }

      if (this.isIndexValue(value)) {
        fields[qualifiedField] = value;
      }
    }

    return fields;
  };

  /** Build qualified Link & Lock field metadata, including optional fields. */
  protected buildIndexWriteContext = (
    typeName: string,
  ): StructuredWriteContext => {
    const occupancyFields: StructuredOccupancyFieldMap = {};

    for (const [fieldName, capability] of Object.entries(
      this.getIndexedFieldCapabilities(typeName),
    )) {
      if (!capability.range) continue;
      occupancyFields[
        qualifyIndexField(typeName, capability.field ?? fieldName)
      ] = {
        type: capability.range.valueType,
        ...(capability.range.decimal ? { decimal: true } : {}),
      };
    }

    return { occupancyFields };
  };

  /**
   * Return all TypeInfo types known to this ORM for index maintenance.
   * @returns Type descriptors derived from current ORM/index configuration.
   */
  getIndexMaintenanceTypeDescriptors =
    (): TypeInfoORMIndexMaintenanceTypeDescriptor[] => {
      const descriptors: TypeInfoORMIndexMaintenanceTypeDescriptor[] = [];

      for (const typeName of Object.keys(this.config.typeInfoMap).sort()) {
        const typeInfo = this.getTypeInfo(typeName);
        const capabilities = this.getIndexedFieldCapabilities(typeName);
        const structuredFields: string[] = [];
        const textFields: string[] = [];

        for (const [fieldName, capability] of Object.entries(capabilities)) {
          const qualifiedField = qualifyIndexField(
            typeName,
            capability.field ?? fieldName,
          );

          if (
            capability.exact ||
            capability.membership ||
            capability.range
          ) {
            structuredFields.push(qualifiedField);
          }

          if (capability.text) {
            textFields.push(qualifiedField);
          }
        }

        const sortedCapabilities = Object.entries(capabilities)
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([fieldName, capability]) => [
            fieldName,
            {
              field: capability.field ?? fieldName,
              collection: capability.collection === true,
              exact: capability.exact === true,
              membership: capability.membership === true,
              range: capability.range
                ? {
                    valueType: capability.range.valueType,
                    decimal: capability.range.decimal === true,
                  }
                : undefined,
              text: capability.text
                ? Object.entries(capability.text)
                    .filter(([, enabled]) => enabled === true)
                    .map(([mode]) => mode)
                    .sort()
                : undefined,
              optional: capability.optional === true,
            },
          ]);
        const sortedTypeFields = Object.entries(typeInfo.fields ?? {})
          .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
          .map(([fieldName, field]) => [
            fieldName,
            {
              type: field.type,
              typeReference: field.typeReference,
              array: field.array === true,
              readonly: field.readonly === true,
              optional: field.optional === true,
              indexed: field.tags?.indexed,
            },
          ]);

        descriptors.push({
          typeName,
          primaryField: String(typeInfo.primaryField),
          qualifiedFieldPrefix: qualifyIndexField(typeName, ""),
          indexFingerprint: JSON.stringify({
            primaryField: String(typeInfo.primaryField),
            typeFields: sortedTypeFields,
            indexCapabilities: sortedCapabilities,
          }),
          structuredFields: Array.from(new Set(structuredFields)).sort(),
          textFields: Array.from(new Set(textFields)).sort(),
        });
      }

      return descriptors;
    };

  /**
   * Enumerate bounded structured document mirrors when supported.
   * @param options Paging options.
   * @returns Structured index document page, or undefined when unsupported.
   */
  listStructuredIndexDocuments = async (
    options: StructuredDocumentListOptions = {},
  ): Promise<StructuredDocumentPage | undefined> =>
    this.config.indexing?.backend.values.documents?.list?.(options);

  /**
   * Enumerate bounded full-text document mirrors when supported.
   * @param options Paging options.
   * @returns Full-text document page, or undefined when unsupported.
   */
  listTextIndexDocuments = async (
    options: TextIndexDocumentListOptions = {},
  ): Promise<TextIndexDocumentPage | undefined> =>
    this.config.indexing?.backend.text?.listDocuments?.(options);

  /**
   * Verify canonical item existence for index maintenance.
   *
   * Drivers with a strong-read capability are preferred. Best-effort reads are
   * still useful for diagnostics but must not authorize destructive healing.
   *
   * @param typeName TypeInfo type to verify.
   * @param primaryFieldValue Canonical item identifier.
   * @returns Existence result and the consistency level used.
   */
  verifyStoredItemForIndexMaintenance = async (
    typeName: string,
    primaryFieldValue: LiteralValue,
  ): Promise<TypeInfoORMIndexMaintenanceVerification> => {
    const driver = this.config.getDriver(typeName);
    if (!driver) {
      throw new Error(TypeInfoORMServiceError.INVALID_DRIVER);
    }

    const strongReader = driver.readItemStronglyConsistent;
    const reader = strongReader ?? driver.readItem;
    const consistency = strongReader ? "strong" : "bestEffort";

    try {
      const item = await reader.call(driver, primaryFieldValue as any);
      return { exists: true, consistency, item };
    } catch (error: any) {
      if (error?.message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND) {
        return { exists: false, consistency };
      }

      throw error;
    }
  };

  /**
   * Safely clean orphaned index state for exactly one type+id.
   *
   * The method refuses destructive cleanup without a strongly consistent
   * canonical read. It rechecks canonical state after destructive phases and
   * reindexes a concurrently-created item before returning.
   *
   * @param typeName TypeInfo type being repaired.
   * @param primaryFieldValue Canonical item identifier.
   * @param config Guard data captured during the audit.
   * @returns Guarded cleanup outcome.
   */
  cleanupOrphanedIndexState = async (
    typeName: string,
    primaryFieldValue: LiteralValue,
    config: TypeInfoORMOrphanIndexCleanupConfig = {},
  ): Promise<TypeInfoORMOrphanIndexCleanupResult> => {
    const descriptor = this.getIndexMaintenanceTypeDescriptors().find(
      (entry) => entry.typeName === typeName,
    );
    if (!descriptor) {
      throw {
        message: TypeInfoORMServiceError.INVALID_TYPE_INFO,
        typeName,
      };
    }

    const verification = await this.verifyStoredItemForIndexMaintenance(
      typeName,
      primaryFieldValue,
    );
    if (verification.consistency !== "strong") {
      return {
        status: "strongConsistencyUnavailable",
        cleanupAttempted: false,
        canonicalReindexed: false,
      };
    }

    if (verification.exists) {
      await this.reindexStoredItem(typeName, primaryFieldValue);
      return {
        status: "canonicalExists",
        cleanupAttempted: false,
        canonicalReindexed: true,
      };
    }

    const indexing = this.config.indexing;
    if (!indexing) {
      return {
        status: "maintenanceUnsupported",
        cleanupAttempted: false,
        canonicalReindexed: false,
      };
    }

    const structuredWriter = indexing.backend.valueWriter;
    const textMaintenance = indexing.backend.text;
    const hasStructuredCleanup = config.structuredVersion !== undefined;
    const textFields = Array.from(
      new Set(config.textIndexFields ?? descriptor.textFields),
    );
    if (
      textFields.some(
        (field) => !field.startsWith(descriptor.qualifiedFieldPrefix),
      )
    ) {
      throw new Error(
        "Text index maintenance field does not belong to the requested type.",
      );
    }
    const hasTextCleanup = textFields.length > 0;

    if (
      (hasStructuredCleanup && !structuredWriter) ||
      (hasTextCleanup && !textMaintenance?.removeDocumentIndex)
    ) {
      return {
        status: "maintenanceUnsupported",
        cleanupAttempted: false,
        canonicalReindexed: false,
      };
    }

    const restoreIfCanonicalAppeared = async (): Promise<boolean> => {
      const current = await this.verifyStoredItemForIndexMaintenance(
        typeName,
        primaryFieldValue,
      );

      if (current.consistency !== "strong" || !current.exists) {
        return false;
      }

      await this.reindexStoredItem(typeName, primaryFieldValue);
      return true;
    };

    let cleanupAttempted = false;

    if (hasStructuredCleanup && structuredWriter) {
      cleanupAttempted = true;
      try {
        await structuredWriter.write(
          normalizeDocId(primaryFieldValue, descriptor.primaryField),
          {},
          {
            ...this.buildIndexWriteContext(typeName),
            deleted: true,
            expectedVersion: config.structuredVersion,
          },
        );
      } catch (error) {
        if (await restoreIfCanonicalAppeared()) {
          return {
            status: "concurrentCanonicalRestored",
            cleanupAttempted: true,
            canonicalReindexed: true,
          };
        }

        if (error instanceof StructuredIndexVersionMismatchError) {
          return {
            status: "indexChanged",
            cleanupAttempted: true,
            canonicalReindexed: false,
          };
        }

        throw error;
      }

      if (await restoreIfCanonicalAppeared()) {
        return {
          status: "concurrentCanonicalRestored",
          cleanupAttempted: true,
          canonicalReindexed: true,
        };
      }
    }

    if (hasTextCleanup && textMaintenance?.removeDocumentIndex) {
      const docId = normalizeDocId(primaryFieldValue, descriptor.primaryField);

      for (const indexField of textFields) {
        cleanupAttempted = true;
        await textMaintenance.removeDocumentIndex(docId, indexField);

        if (await restoreIfCanonicalAppeared()) {
          return {
            status: "concurrentCanonicalRestored",
            cleanupAttempted: true,
            canonicalReindexed: true,
          };
        }
      }
    }

    if (await restoreIfCanonicalAppeared()) {
      return {
        status: "concurrentCanonicalRestored",
        cleanupAttempted,
        canonicalReindexed: true,
      };
    }

    return {
      status: "cleaned",
      cleanupAttempted,
      canonicalReindexed: false,
    };
  };

  /**
   * Reconcile one bounded page of canonical items after an index-relevant
   * TypeInfo schema change.
   *
   * Structured writes replace the persisted structured mirror, which removes
   * fields no longer indexed. Full-text fields removed from the schema are
   * deleted through document-level maintenance before current fields are
   * reindexed.
   *
   * @param typeName Current TypeInfo type.
   * @param config Previous schema descriptor and paging state.
   * @returns Processed count and continuation token.
   */
  reconcileStoredTypeIndexesPage = async (
    typeName: string,
    config: TypeInfoORMReconcileStoredTypeIndexesPageConfig = {},
  ): Promise<TypeInfoORMReconcileStoredTypeIndexesPageResult> => {
    const currentDescriptor = this.getIndexMaintenanceTypeDescriptors().find(
      (entry) => entry.typeName === typeName,
    );
    if (!currentDescriptor) {
      throw {
        message: TypeInfoORMServiceError.INVALID_TYPE_INFO,
        typeName,
      };
    }

    const driver = this.getDriverInternal(typeName);
    const page = await driver.listItems({
      itemsPerPage: Math.max(1, config.itemsPerPage ?? 100),
      cursor: config.cursor,
    });
    const staleTextFields = (config.previousDescriptor?.textFields ?? []).filter(
      (field) => !currentDescriptor.textFields.includes(field),
    );
    const textMaintenance = this.config.indexing?.backend.text;
    const primaryFieldName = currentDescriptor.primaryField;
    let processedCount = 0;

    for (const item of page.items) {
      const primaryFieldValue =
        item[primaryFieldName as keyof TypeInfoDataItem];
      if (typeof primaryFieldValue === "undefined") {
        continue;
      }

      const docId = normalizeDocId(primaryFieldValue, primaryFieldName);
      if (staleTextFields.length > 0) {
        if (!textMaintenance?.removeDocumentIndex) {
          throw new Error(
            "Text index schema reconciliation requires document maintenance support.",
          );
        }
        for (const indexField of staleTextFields) {
          await textMaintenance.removeDocumentIndex(docId, indexField);
        }
      }

      await this.indexItemIndexes(typeName, item);
      processedCount += 1;
    }

    return {
      processedCount,
      cursor: page.cursor,
    };
  };

  /**
   * Remove one removed-Type index identity after the schema removal has been
   * independently confirmed by Health monitoring.
   *
   * This method never touches canonical data. It only removes index artifacts
   * belonging to the prior type namespace.
   *
   * @param primaryFieldValue Persisted document identity.
   * @param config Prior type descriptor and audited index state.
   */
  cleanupRemovedTypeIndexState = async (
    primaryFieldValue: LiteralValue,
    config: TypeInfoORMRemovedTypeIndexCleanupConfig,
  ): Promise<TypeInfoORMRemovedTypeIndexCleanupResult> => {
    const indexing = this.config.indexing;
    if (!indexing) {
      return {
        status: "maintenanceUnsupported",
        cleanupAttempted: false,
      };
    }

    const { previousDescriptor } = config;
    const docId = normalizeDocId(
      primaryFieldValue,
      previousDescriptor.primaryField,
    );

    if (config.structuredVersion !== undefined) {
      const structuredWriter = indexing.backend.valueWriter;
      if (!structuredWriter) {
        return {
          status: "maintenanceUnsupported",
          cleanupAttempted: false,
        };
      }

      try {
        await structuredWriter.write(docId, {}, {
          deleted: true,
          expectedVersion: config.structuredVersion,
        });
      } catch (error) {
        if (error instanceof StructuredIndexVersionMismatchError) {
          return {
            status: "indexChanged",
            cleanupAttempted: true,
          };
        }

        throw error;
      }
    }

    const textFields = Array.from(
      new Set(config.textIndexFields ?? previousDescriptor.textFields),
    );
    if (
      textFields.some(
        (field) => !field.startsWith(previousDescriptor.qualifiedFieldPrefix),
      )
    ) {
      throw new Error(
        "Removed-Type text index field does not belong to the prior type namespace.",
      );
    }

    if (textFields.length > 0) {
      const textMaintenance = indexing.backend.text;
      if (!textMaintenance?.removeDocumentIndex) {
        return {
          status: "maintenanceUnsupported",
          cleanupAttempted: config.structuredVersion !== undefined,
        };
      }
      for (const indexField of textFields) {
        await textMaintenance.removeDocumentIndex(docId, indexField);
      }
    }

    return {
      status: "cleaned",
      cleanupAttempted:
        config.structuredVersion !== undefined || textFields.length > 0,
    };
  };

  /**
   * @returns Item snapshot normalized for indexing operations.
   */
  protected getIndexedItemSnapshot = (
    /**
     * Type name used to clean the item.
     */
    typeName: string,
    /**
     * Item snapshot to normalize.
     */
    item: Partial<TypeInfoDataItem>,
  ): Partial<TypeInfoDataItem> => this.getCleanItem(typeName, item, {});

  /**
   * @returns Promise resolved once indexing is complete.
   */
  protected async mutateItemIndexPlan(
    typeName: string,
    action:
      | { type: "index"; next: Partial<TypeInfoDataItem>; fields?: string[] }
      | {
          type: "remove";
          previous: Partial<TypeInfoDataItem>;
          fields?: string[];
        }
      | {
          type: "replace";
          previous: Partial<TypeInfoDataItem>;
          next: Partial<TypeInfoDataItem>;
          previousFields?: string[];
          nextFields?: string[];
        },
  ): Promise<void> {
    const indexing = this.config.indexing;
    if (!indexing) return;
    const { primaryField } = this.getTypeInfo(typeName);
    const primaryFieldName = String(primaryField);
    const previous = action.type === "index" ? undefined : action.previous;
    const next = action.type === "remove" ? undefined : action.next;
    const identity = next ?? previous;
    const docId = normalizeDocId(
      identity?.[primaryFieldName as keyof TypeInfoDataItem],
      primaryFieldName,
    );
    const capabilities = this.getIndexedFieldCapabilities(typeName);
    const previousFields = this.resolveIndexFields(
      typeName,
      action.type === "replace" ? action.previousFields : action.fields,
    );
    const nextFields = this.resolveIndexFields(
      typeName,
      action.type === "replace" ? action.nextFields : action.fields,
    );
    const textBackend = indexing.backend.text;
    const textOperations: Promise<void>[] = [];

    if (textBackend) {
      const previousText = previousFields.filter(
        (field) =>
          capabilities[field]?.text ||
          (action.type === "replace" &&
            action.previousFields?.includes(field) &&
            !capabilities[field]),
      );
      const nextText = nextFields.filter((field) => capabilities[field]?.text);
      const sameTextFields =
        JSON.stringify(previousText) === JSON.stringify(nextText);

      if (previous && next && sameTextFields) {
        for (const field of nextText) {
          textOperations.push(
            replaceFullTextDocumentIndex({
              backend: textBackend,
              previousDocument: previous,
              nextDocument: next,
              primaryField: primaryFieldName,
              indexField: field,
              indexFieldQualified: qualifyIndexField(
                typeName,
                capabilities[field]?.field ?? field,
              ),
            }),
          );
        }
      } else {
        if (previous) {
          for (const field of previousText) {
            textOperations.push(
              removeDocument({
                backend: textBackend,
                document: previous,
                primaryField: primaryFieldName,
                indexField: field,
                indexFieldQualified: qualifyIndexField(
                  typeName,
                  capabilities[field]?.field ?? field,
                ),
              }),
            );
          }
        }
        if (next) {
          for (const field of nextText) {
            textOperations.push(
              indexDocument({
                backend: textBackend,
                document: next,
                primaryField: primaryFieldName,
                indexField: field,
                indexFieldQualified: qualifyIndexField(
                  typeName,
                  capabilities[field]?.field ?? field,
                ),
              }),
            );
          }
        }
      }
    }

    if (indexing.backend.valueWriter) {
      textOperations.push(
        indexing.backend.valueWriter.write(
          docId,
          next ? this.buildIndexValueFields(typeName, next) : {},
          {
            ...this.buildIndexWriteContext(typeName),
            ...(next ? {} : { deleted: true }),
          },
        ),
      );
    }
    this.emitIndexWrite(
      typeName,
      String(docId),
      next ? "upsert" : "remove",
      nextFields.length,
    );
    await Promise.all(textOperations);
  }

  /**
   * Write the provided item snapshot into the configured indexes.
   *
   * Use this when data was created or modified outside `TypeInfoORMService`.
   *
   * @param typeName Type name for the indexed item.
   * @param item Item snapshot to index.
   * @param config Optional field overrides.
   * @returns Promise resolved when manual indexing completes.
   */
  indexItemIndexes = async (
    typeName: string,
    item: Partial<TypeInfoDataItem>,
    config: TypeInfoORMManualIndexingConfig = {},
  ): Promise<void> => {
    const indexedItem = this.getIndexedItemSnapshot(typeName, item);

    const operation = async () => {
      await this.mutateItemIndexPlan(typeName, {
        type: "index",
        next: indexedItem,
        fields: config.indexFields,
      });
    };
    const coordinator = this.config.indexing?.mutationCoordinator;
    await (coordinator ? coordinator.run(operation) : operation());
  };

  /**
   * Remove the provided item snapshot from the configured indexes.
   *
   * Use this when data was deleted outside `TypeInfoORMService`.
   *
   * @param typeName Type name for the indexed item.
   * @param item Item snapshot to remove from the indexes.
   * @param config Optional field overrides.
   * @returns Promise resolved when index cleanup completes.
   */
  removeItemIndexes = async (
    typeName: string,
    item: Partial<TypeInfoDataItem>,
    config: TypeInfoORMManualIndexingConfig = {},
  ): Promise<void> => {
    const indexedItem = this.getIndexedItemSnapshot(typeName, item);

    const operation = async () => {
      await this.mutateItemIndexPlan(typeName, {
        type: "remove",
        previous: indexedItem,
        fields: config.indexFields,
      });
    };
    const coordinator = this.config.indexing?.mutationCoordinator;
    await (coordinator ? coordinator.run(operation) : operation());
  };

  /**
   * Replace one indexed item snapshot with another.
   *
   * Use this when an existing stored item changed outside `TypeInfoORMService`
   * or when a schema/config change requires removing old indexed fields and
   * indexing a new field set.
   *
   * @param typeName Type name for the indexed item.
   * @param previousItem Previous item snapshot to remove.
   * @param nextItem Next item snapshot to index.
   * @param config Optional previous/next field overrides.
   * @returns Promise resolved when replacement indexing completes.
   */
  replaceItemIndexes = async (
    typeName: string,
    previousItem: Partial<TypeInfoDataItem>,
    nextItem: Partial<TypeInfoDataItem>,
    config: TypeInfoORMReplaceIndexingConfig = {},
  ): Promise<void> => {
    const previousIndexedItem = this.getIndexedItemSnapshot(
      typeName,
      previousItem,
    );
    const nextIndexedItem = this.getIndexedItemSnapshot(typeName, nextItem);

    const operation = async () => {
      await this.mutateItemIndexPlan(typeName, {
        type: "replace",
        previous: previousIndexedItem,
        next: nextIndexedItem,
        previousFields: config.previousIndexFields,
        nextFields: config.nextIndexFields,
      });
    };
    const coordinator = this.config.indexing?.mutationCoordinator;
    await (coordinator ? coordinator.run(operation) : operation());
  };

  /**
   * Reindex the current stored item using the configured driver.
   *
   * When no previous snapshot is supplied, the current stored item is used for
   * both removal and indexing to refresh existing postings without duplication.
   * Supply `previousItem` when an out-of-band update changed indexed field
   * values, otherwise stale index entries cannot be removed safely.
   *
   * @param typeName Type name to reindex.
   * @param primaryFieldValue Primary field value for the stored item.
   * @param config Optional previous snapshot and indexed field overrides.
   * @returns True when reindexing completed.
   */
  reindexStoredItem = async (
    typeName: string,
    primaryFieldValue: LiteralValue,
    config: TypeInfoORMReindexStoredItemConfig = {},
  ): Promise<boolean> => {
    const driver = this.getDriverInternal(typeName);
    const currentItem = await driver.readItem(primaryFieldValue as any);
    const previousItem = config.previousItem ?? currentItem;

    await this.replaceItemIndexes(typeName, previousItem, currentItem, {
      previousIndexFields: config.previousIndexFields,
      nextIndexFields: config.nextIndexFields,
    });

    return true;
  };

  /**
   * Reindex all currently stored items for a type.
   *
   * This is intended for maintenance passes after out-of-band writes or
   * schema/index configuration changes. Deleted items still require explicit
   * cleanup via {@link removeItemIndexes}, because index removal needs a prior
   * snapshot of indexed field values. For out-of-band updates
   * that changed indexed values, provide `previousItemsByPrimaryField`.
   *
   * @param typeName Type name to reindex.
   * @param config Paging, previous snapshots, and indexed field overrides.
   * @returns Count of processed stored items.
   */
  reindexStoredType = async (
    typeName: string,
    config: TypeInfoORMReindexStoredTypeConfig = {},
  ): Promise<TypeInfoORMReindexStoredTypeResults> => {
    const driver = this.getDriverInternal(typeName);
    const primaryFieldName = String(this.getTypeInfo(typeName).primaryField);
    const itemsPerPage = config.itemsPerPage ?? 100;
    let processedCount = 0;
    let cursor: string | undefined;

    do {
      const page = await driver.listItems({ itemsPerPage, cursor });

      for (const item of page.items) {
        const primaryFieldValue =
          item[primaryFieldName as keyof TypeInfoDataItem];

        if (typeof primaryFieldValue === "undefined") {
          continue;
        }

        const previousItem =
          config.previousItemsByPrimaryField?.[String(primaryFieldValue)] ??
          item;

        await this.replaceItemIndexes(typeName, previousItem, item, {
          previousIndexFields: config.previousIndexFields,
          nextIndexFields: config.nextIndexFields,
        });
        processedCount += 1;
      }

      cursor = page.cursor;
    } while (cursor);

    return { processedCount };
  };

  /**
   * @returns Nothing (throws on invalid operations).
   */
  protected validateReadOperation = (
    /**
     * Type name to validate for read.
     */
    typeName: string,
    /**
     * Optional selected fields to validate.
     */
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => {
    const typeInfo = this.getTypeInfo(typeName);
    const { fields = {} } = typeInfo;
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );
    const results: TypeInfoValidationResults = {
      typeName,
      valid: !!typeInfo,
      error: !!typeInfo
        ? getNoErrorDescriptor()
        : getErrorDescriptor(ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST),
      errorMap: {},
    };
    const {
      valid: operationValid,
      error: operationError,
      errorMap: operationErrorMap,
    } = validateTypeOperationAllowed(
      typeName,
      cleanSelectedFields ? cleanSelectedFields : Object.keys(fields),
      TypeOperation.READ,
      typeInfo,
    );

    results.valid = getValidityValue(results.valid, operationValid);
    results.error = operationError;

    for (const oE in operationErrorMap) {
      const existingError = results.errorMap[oE] ?? [];

      results.errorMap[oE] = existingError
        ? [...existingError, ...operationErrorMap[oE]]
        : operationErrorMap[oE];
    }

    if (
      !operationValid &&
      operationError.code !== ERROR_MESSAGE_CONSTANTS.NONE
    ) {
      results.error = operationError;
    }

    if (!results.valid) {
      throw results;
    }
  };

  /**
   * @returns Nothing (throws on invalid items).
   */
  protected validate = (
    /**
     * Type name to validate.
     */
    typeName: string,
    /**
     * Item to validate.
     */
    item: TypeInfoDataItem,
    /**
     * Operation being validated.
     */
    typeOperation: TypeOperation,
    /**
     * Whether the item is a partial update.
     */
    itemIsPartial?: boolean,
  ) => {
    const validationResults = validateTypeInfoValue(
      item,
      typeName,
      this.config.typeInfoMap,
      true,
      this.config.customValidators,
      typeOperation,
      RelationshipValidationType.STRICT_EXCLUDE,
      itemIsPartial,
    );

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  /**
   * Validate a delete operation against only the item's primary field.
   *
   * Delete receives an identity, not a complete item. The primary field still
   * needs its normal operation and value validation, but unrelated required
   * fields must not participate.
   */
  protected validateDeleteOperation = (
    typeName: string,
    primaryFieldValue: any,
  ): void => {
    const typeInfo = this.getTypeInfo(typeName);
    const { fields = {}, primaryField } = typeInfo;
    const primaryFieldName = String(primaryField);
    const primaryFieldInfo = fields[primaryFieldName];
    const deleteTypeInfo: TypeInfo = {
      ...typeInfo,
      fields: primaryFieldInfo ? { [primaryFieldName]: primaryFieldInfo } : {},
      unionFieldSets: undefined,
    };
    const validationResults = validateTypeInfoValue(
      { [primaryFieldName]: primaryFieldValue },
      typeName,
      {
        ...this.config.typeInfoMap,
        [typeName]: deleteTypeInfo,
      },
      true,
      this.config.customValidators,
      TypeOperation.DELETE,
      RelationshipValidationType.STRICT_EXCLUDE,
    );

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  /**
   * Validate update operator config against the target TypeInfo fields.
   */
  protected validateUpdateConfig = (
    typeName: string,
    item: TypeInfoDataItem,
    updateConfig?: TypeInfoORMUpdateConfig,
  ): void => {
    const fieldOperators = updateConfig?.fieldOperators;

    if (!fieldOperators) {
      return;
    }

    const { fields = {}, primaryField } = this.getTypeInfo(typeName);

    for (const [fieldName, operator] of Object.entries(fieldOperators)) {
      const field = fields[fieldName];
      const itemValue = item[fieldName];
      const isNumberOperator = Object.values(
        TypeInfoORMUpdateOperators.NUMBER,
      ).includes(
        operator as (typeof TypeInfoORMUpdateOperators.NUMBER)[keyof typeof TypeInfoORMUpdateOperators.NUMBER],
      );

      if (
        !field ||
        fieldName === primaryField ||
        !isNumberOperator ||
        field.array ||
        field.type !== "number" ||
        typeof itemValue !== "number"
      ) {
        const validationResults: TypeInfoValidationResults = {
          typeName,
          valid: false,
          error: getErrorDescriptor(
            TypeInfoORMServiceError.INVALID_UPDATE_OPERATOR,
          ),
          errorMap: {
            [fieldName]: [
              getErrorDescriptor(
                TypeInfoORMServiceError.INVALID_UPDATE_OPERATOR,
              ),
            ],
          },
        };

        throw validationResults;
      }
    }
  };

  /**
   * @returns Cleaned item with selected fields and DAC constraints applied.
   */
  protected getCleanItem = (
    /**
     * Type name used to look up TypeInfo.
     */
    typeName: string,
    /**
     * Item to clean.
     */
    item: Partial<TypeInfoDataItem>,
    /**
     * Optional DAC field resource map.
     */
    dacFieldResources?: Partial<
      Record<keyof TypeInfoDataItem, DACAccessResult>
    >,
    /**
     * Optional selected fields to include.
     */
    selectedFields?: (keyof TypeInfoDataItem)[],
  ): Partial<TypeInfoDataItem> => {
    const typeInfo = this.getTypeInfo(typeName);
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );
    const itemCleanedByTypeInfo = removeUnselectedFieldsFromDataItem(
      removeTypeReferenceFieldsFromDataItem(
        typeInfo,
        removeNonexistentFieldsFromDataItem(typeInfo, item),
      ),
      cleanSelectedFields,
    );

    if (dacFieldResources) {
      const itemCleanedByDAC: Partial<TypeInfoDataItem> = {};

      for (const fN in itemCleanedByTypeInfo) {
        const fR = dacFieldResources[fN];

        if (fR) {
          const { allowed, denied } = fR;

          if (allowed && !denied) {
            itemCleanedByDAC[fN] = itemCleanedByTypeInfo[fN];
          }
        } else {
          itemCleanedByDAC[fN] = itemCleanedByTypeInfo[fN];
        }
      }

      return itemCleanedByDAC;
    } else {
      return itemCleanedByTypeInfo;
    }
  };

  /**
   * @returns Sanitized selected fields or undefined for all fields.
   */
  protected getCleanSelectedFields = (
    /**
     * Type name used to look up TypeInfo.
     */
    typeName: string,
    /**
     * Optional selected fields to include.
     */
    selectedFields?: (keyof TypeInfoDataItem)[],
  ): (keyof TypeInfoDataItem)[] | undefined => {
    const typeInfo = this.getTypeInfo(typeName);
    const { primaryField } = typeInfo;

    let cleanSelectedFields =
      removeTypeReferenceFieldsFromSelectedFields<TypeInfoDataItem>(
        typeInfo,
        removeNonexistentFieldsFromSelectedFields<TypeInfoDataItem>(
          typeInfo,
          selectedFields,
        ),
      );

    if (
      primaryField &&
      Array.isArray(cleanSelectedFields) &&
      !cleanSelectedFields.includes(primaryField)
    ) {
      // IMPORTANT: Ensure that the primary field is always included in the selected fields.
      cleanSelectedFields = [...cleanSelectedFields, primaryField];
    }

    return cleanSelectedFields;
  };

  /**
   * @returns Nothing (throws on invalid relationships).
   */
  protected validateRelationshipItem = (
    /**
     * Relationship item to validate.
     */
    relationshipItem: ItemRelationshipInfoType,
    /**
     * Relationship fields to omit from validation.
     */
    omitFields: ItemRelationshipInfoKeys[],
  ) => {
    const validationResults = validateRelationshipItem(
      relationshipItem as BaseItemRelationshipInfo,
      omitFields,
    );

    if (!validationResults.valid) {
      throw validationResults;
    } else {
      const { fromTypeName, fromTypeFieldName } = relationshipItem;
      const {
        fields: {
          [fromTypeFieldName]: { typeReference = undefined } = {},
        } = {},
      } = this.getTypeInfo(fromTypeName);
      const relatedTypeInfo = typeReference
        ? this.getTypeInfo(typeReference)
        : undefined;

      if (!relatedTypeInfo) {
        const relationshipValidationResults: TypeInfoValidationResults = {
          typeName: fromTypeName,
          valid: false,
          error: getErrorDescriptor(
            TypeInfoORMServiceError.INVALID_RELATIONSHIP,
          ),
          errorMap: {},
        };

        throw relationshipValidationResults;
      }
    }
  };

  /**
   * @returns Promise resolved once cleanup is complete.
   */
  protected cleanupRelationships = async (
    /**
     * Relationship originating item used for cleanup.
     */
    relationshipOriginatingItem: ItemRelationshipOriginatingItemInfo,
  ): Promise<void> => {
    if (this.config.createRelationshipCleanupItem) {
      await this.config.createRelationshipCleanupItem(
        relationshipOriginatingItem,
      );
    }
  };

  /**
   * Create a new relationship between two items.
   * @param relationshipItem Relationship item to create.
   *
   * When DAC is enabled and `getOwnerPrefix` is configured, relationship
   * creation requires:
   * 1) relationship permission on the relationship resource path, and
   * 2) endpoint ownership permission for both `from` and `to` items.
   * @returns True when the relationship was created.
   * */
  createRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
    context?: TypeInfoORMContext,
  ): Promise<boolean> => {
    this.validateRelationshipItem(relationshipItem, []);

    const cleanedItem = cleanRelationshipItem(relationshipItem);
    const { fromTypeName, fromTypeFieldName } = cleanedItem;
    const {
      fields: {
        [fromTypeFieldName]: { array: relationshipIsMultiple = false } = {},
      } = {},
    } = this.getTypeInfo(fromTypeName);
    const {
      fields: { [fromTypeFieldName]: { typeReference = undefined } = {} } = {},
    } = this.getTypeInfo(fromTypeName);
    const relatedTypeName =
      typeof typeReference === "string" ? typeReference : undefined;

    if (!relatedTypeName) {
      throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP);
    }

    const { allowed: createAllowed, denied: createDenied } =
      await this.getRelationshipDACValidation(
        cleanedItem,
        RelationshipOperation.SET,
        context,
      );

    const { allowed: endpointsAllowed, denied: endpointsDenied } =
      await this.getRelationshipEndpointDACValidation(
        cleanedItem,
        RelationshipOperation.SET,
        relatedTypeName,
        context,
      );

    if (
      createDenied ||
      !createAllowed ||
      endpointsDenied ||
      !endpointsAllowed
    ) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        relationshipItem,
      };
    } else {
      if (this.config.indexing?.relations) {
        const driver = this.getIndexingRelationshipDriverInternal();

        await driver.createRelationship(
          cleanedItem,
          relatedTypeName,
          !relationshipIsMultiple,
        );

        return true;
      }

      const driver = this.getRelationshipDriverInternal(
        fromTypeName,
        fromTypeFieldName,
      );

      if (relationshipIsMultiple) {
        await driver.createItem(cleanedItem);
      } else {
        // VALIDATION: Need to update when the field is not an array.
        const {
          items: [
            { [ItemRelationshipInfoIdentifyingKeys.id]: existingIdentifier },
          ] = [{} as ItemRelationshipInfo],
        } = (await driver.listItems(
          {
            criteria: {
              logicalOperator: LogicalOperators.AND,
              fieldCriteria: [
                {
                  fieldName: ItemRelationshipInfoKeys.fromTypeName,
                  operator: ComparisonOperators.EQUALS,
                  value: fromTypeName,
                },
                {
                  fieldName: ItemRelationshipInfoKeys.fromTypeFieldName,
                  operator: ComparisonOperators.EQUALS,
                  value: fromTypeFieldName,
                },
              ],
            },
            itemsPerPage: 1,
          },
          [ItemRelationshipInfoIdentifyingKeys.id],
        )) as ListItemsResults<ItemRelationshipInfo>;

        if (existingIdentifier) {
          await driver.updateItem(existingIdentifier, cleanedItem);
        } else {
          await driver.createItem(cleanedItem);
        }
      }

      return true;
    }
  };

  /**
   * Delete a relationship between two items.
   * @param relationshipItem Relationship item to delete.
   *
   * When DAC is enabled and `getOwnerPrefix` is configured, relationship
   * deletion requires:
   * 1) relationship permission on the relationship resource path, and
   * 2) endpoint ownership permission for both `from` and `to` items.
   * @returns Deletion results including whether items remain.
   * */
  deleteRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
    context?: TypeInfoORMContext,
  ): Promise<DeleteRelationshipResults> => {
    this.validateRelationshipItem(relationshipItem, []);

    const cleanedItem = cleanRelationshipItem(relationshipItem);
    const {
      fromTypeName,
      fromTypeFieldName,
      fromTypePrimaryFieldValue,
      toTypePrimaryFieldValue,
    } = cleanedItem;
    const {
      fields: { [fromTypeFieldName]: { typeReference = undefined } = {} } = {},
    } = this.getTypeInfo(fromTypeName);
    const relatedTypeName =
      typeof typeReference === "string" ? typeReference : undefined;

    if (!relatedTypeName) {
      throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP);
    }

    const { allowed: deleteAllowed, denied: deleteDenied } =
      await this.getRelationshipDACValidation(
        cleanedItem,
        RelationshipOperation.UNSET,
        context,
      );

    const { allowed: endpointsAllowed, denied: endpointsDenied } =
      await this.getRelationshipEndpointDACValidation(
        cleanedItem,
        RelationshipOperation.UNSET,
        relatedTypeName,
        context,
      );

    if (
      deleteDenied ||
      !deleteAllowed ||
      endpointsDenied ||
      !endpointsAllowed
    ) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        relationshipItem,
      };
    } else {
      if (this.config.indexing?.relations) {
        const driver = this.getIndexingRelationshipDriverInternal();
        await driver.deleteRelationship(cleanedItem, relatedTypeName);

        return {
          success: true,
          remainingItemsExist: false,
        };
      }

      const driver = this.getRelationshipDriverInternal(
        fromTypeName,
        fromTypeFieldName,
      );
      const { items: itemList = [], cursor } = (await driver.listItems({
        criteria: {
          logicalOperator: LogicalOperators.AND,
          fieldCriteria: [
            {
              fieldName: ItemRelationshipInfoKeys.fromTypeName,
              operator: ComparisonOperators.EQUALS,
              value: fromTypeName,
            },
            {
              fieldName: ItemRelationshipInfoKeys.fromTypePrimaryFieldValue,
              operator: ComparisonOperators.EQUALS,
              value: fromTypePrimaryFieldValue,
            },
            {
              fieldName: ItemRelationshipInfoKeys.fromTypeFieldName,
              operator: ComparisonOperators.EQUALS,
              value: fromTypeFieldName,
            },
            {
              fieldName: ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
              operator: ComparisonOperators.EQUALS,
              value: toTypePrimaryFieldValue,
            },
          ],
        },
      })) as ListItemsResults<ItemRelationshipInfo>;

      for (const item of itemList) {
        const { id: itemId } = item;

        await driver.deleteItem(itemId);
      }

      return {
        success: true,
        remainingItemsExist: !!cursor,
      };
    }
  };

  /**
   * List the relationships for a given item.
   * @param config Relationship list configuration.
   * @returns Relationship items and paging cursor.
   * */
  listRelationships = async (
    config: ListRelationshipsConfig,
    context?: TypeInfoORMContext,
  ): Promise<ListItemsResults<ItemRelationshipInfo>> => {
    const { useDAC } = this.config;
    const { relationshipItemOrigin, ...remainingConfig } = config;
    this.validateRelationshipItem(relationshipItemOrigin, [
      ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
    ]);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const {
      fields: { [fromTypeFieldName]: { typeReference = undefined } = {} } = {},
    } = this.getTypeInfo(fromTypeName);
    const relatedTypeName =
      typeof typeReference === "string" ? typeReference : undefined;

    if (!relatedTypeName) {
      throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP);
    }

    const results = this.config.indexing?.relations
      ? await this.getIndexingRelationshipDriverInternal().listRelationships(
          {
            relationshipItemOrigin: {
              fromTypeName,
              fromTypeFieldName,
              fromTypePrimaryFieldValue,
            },
            ...remainingConfig,
          },
          relatedTypeName,
        )
      : await this.getRelationshipDriverInternal(
          fromTypeName,
          fromTypeFieldName,
        ).listItems({
          ...remainingConfig,
          criteria: {
            logicalOperator: LogicalOperators.AND,
            fieldCriteria: [
              {
                fieldName: ItemRelationshipInfoKeys.fromTypeName,
                operator: ComparisonOperators.EQUALS,
                value: fromTypeName,
              },
              {
                fieldName: ItemRelationshipInfoKeys.fromTypeFieldName,
                operator: ComparisonOperators.EQUALS,
                value: fromTypeFieldName,
              },
              {
                fieldName: ItemRelationshipInfoKeys.fromTypePrimaryFieldValue,
                operator: ComparisonOperators.EQUALS,
                value: fromTypePrimaryFieldValue,
              },
            ],
          },
        });

    if (useDAC) {
      const { items = [], cursor: nextCursor } = results as ListItemsResults<
        Partial<ItemRelationshipInfo>
      >;
      const revisedItems: ItemRelationshipInfo[] = [];

      for (const rItm of items) {
        const { allowed: readAllowed, denied: readDenied } =
          await this.getRelationshipDACValidation(
            rItm as ItemRelationshipInfo,
            RelationshipOperation.GET,
            context,
          );
        const listDenied = readDenied || !readAllowed;

        if (!listDenied) {
          revisedItems.push(rItm as ItemRelationshipInfo);
        }
      }

      return {
        items: revisedItems,
        cursor: nextCursor,
      };
    } else {
      return results as ListItemsResults<ItemRelationshipInfo>;
    }
  };

  /**
   * List related items for the relationship origin.
   * @param config Relationship list configuration.
   * @param selectedFields Optional fields to select on related items.
   * @returns Items and cursor for related items.
   */
  listRelatedItems = async (
    config: ListRelationshipsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
    context?: TypeInfoORMContext,
  ) => {
    const {
      relationshipItemOrigin: { fromTypeName, fromTypeFieldName },
    } = config;
    const {
      fields: {
        [fromTypeFieldName]: {
          typeReference = undefined,
        } = {} as Partial<TypeInfoField>,
      } = {},
    } = this.getTypeInfo(fromTypeName);
    const targetTypeInfo =
      typeof typeReference === "string"
        ? this.getTypeInfo(typeReference)
        : undefined;

    if (
      typeof typeReference === "string" &&
      typeof targetTypeInfo !== "undefined"
    ) {
      const { cursor, items: relationshipItems = [] } =
        await this.listRelationships(config, context);
      const items: Partial<TypeInfoDataItem>[] = [];

      for (const rItm of relationshipItems) {
        const { toTypePrimaryFieldValue } = rItm;
        const itm: Partial<TypeInfoDataItem> = await this.read(
          typeReference,
          toTypePrimaryFieldValue,
          selectedFields,
          context,
        );

        items.push(itm);
      }

      return {
        items,
        cursor,
      };
    } else {
      throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP);
    }
  };

  /**
   * Create a new item of the given type.
   * @param typeName Type name to create.
   * @param item Item payload to create.
   * @returns Primary field value for the created item.
   * */
  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    this.validate(typeName, item, TypeOperation.CREATE);
    const driver = this.getDriverInternal(typeName);
    const cleanItem = this.getCleanItem(typeName, item);
    const newIdentifier = await driver.createItem(cleanItem);
    const { primaryField } = this.getTypeInfo(typeName);
    const indexedItem = {
      ...cleanItem,
      [primaryField as keyof TypeInfoDataItem]: newIdentifier,
    };

    await this.indexItemIndexes(typeName, indexedItem);

    return newIdentifier;
  };

  /**
   * Read an existing item of the given type.
   * @param typeName Type name to read.
   * @param primaryFieldValue Primary field value to fetch.
   * @param selectedFields Optional fields to select.
   * @returns Cleaned item data.
   * */
  read = async (
    typeName: string,
    primaryFieldValue: any,
    selectedFields?: string[],
    context?: TypeInfoORMContext,
  ): Promise<Partial<TypeInfoDataItem>> => {
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );

    this.validateReadOperation(typeName, cleanSelectedFields);

    const { useDAC } = this.config;
    const driver = this.getDriverInternal(typeName);
    const item = await driver.readItem(
      primaryFieldValue,
      // SECURITY: Dac validation could fail when `item` is missing unselected fields.
      // CANNOT pass selected fields to `driver` when DAC is enabled.
      useDAC ? undefined : cleanSelectedFields,
    );
    const {
      allowed: readAllowed,
      denied: readDenied,
      fieldsResources = {},
    } = await this.getItemDACValidation(
      item,
      typeName,
      TypeOperation.READ,
      context,
    );

    if (readDenied || !readAllowed) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        typeName,
        primaryFieldValue,
        selectedFields,
      };
    } else {
      const cleanItem = this.getCleanItem(
        typeName,
        item,
        fieldsResources,
        cleanSelectedFields,
      );

      return cleanItem;
    }
  };

  /**
   * Update an existing item of the given type.
   *
   * This update will always act as a **patch**.
   * Use `null` to signify the deletion of a field.
   * Assign values to **all** fields to perform a **replacement**.
   *
   * The `item` **must always** contain its **primary field value**.
   * @param typeName Type name to update.
   * @param item Item payload to update.
   * @param updateConfig Optional per-field operator config.
   * @returns True when the update succeeded.
   * */
  update = async (
    typeName: string,
    item: TypeInfoDataItem,
    updateConfig?: TypeInfoORMUpdateConfig,
    context?: TypeInfoORMContext,
  ): Promise<boolean> => {
    this.validate(typeName, item, TypeOperation.UPDATE, true);
    this.validateUpdateConfig(typeName, item, updateConfig);

    const { primaryField } = this.getTypeInfo(typeName);
    const primaryFieldValue =
      typeof item === "object" && item !== null
        ? item[primaryField as keyof TypeInfoDataItem]
        : undefined;

    if (typeof primaryFieldValue === "undefined") {
      const validationResults: TypeInfoValidationResults = {
        typeName,
        valid: false,
        error: getErrorDescriptor(
          TypeInfoORMServiceError.NO_PRIMARY_FIELD_VALUE_SUPPLIED,
        ),
        errorMap: {},
      };

      throw validationResults;
    } else {
      const driver = this.getDriverInternal(typeName);
      const initialCleanItem = this.getCleanItem(typeName, item, {});
      const {
        allowed: updateAllowed,
        denied: updateDenied,
        fieldsResources = {},
      } = await this.getItemDACValidation(
        initialCleanItem,
        typeName,
        TypeOperation.UPDATE,
        context,
      );

      if (updateDenied || !updateAllowed) {
        throw {
          message: TypeInfoORMServiceError.INVALID_OPERATION,
          typeName,
          item,
        };
      } else {
        // SECURITY: Update could potentially delete fields. Use `fieldsResources` from `TypeOperation.DELETE` to prevent this issue.
        const { fieldsResources: fieldsResourcesForDeleteOperation = {} } =
          await this.getItemDACValidation(
            initialCleanItem,
            typeName,
            TypeOperation.DELETE,
            context,
          );
        const fieldsResourcesForUpdateOperationForNullFields = Object.keys(
          initialCleanItem,
        ).reduce((acc, fN) => {
          const deleteFieldResource = fieldsResourcesForDeleteOperation[fN];
          if (initialCleanItem[fN] === null && deleteFieldResource) {
            return {
              ...acc,
              [fN]: deleteFieldResource,
            };
          }

          return acc;
        }, {});
        const { fieldsResources: mergedFieldsResources = {} } =
          mergeDACDataItemResourceAccessResultMaps(
            {
              allowed: true,
              denied: false,
              fieldsResources,
            },
            {
              allowed: true,
              denied: false,
              fieldsResources: fieldsResourcesForUpdateOperationForNullFields,
            },
          );
        const cleanItem = this.getCleanItem(
          typeName,
          item,
          mergedFieldsResources,
        );
        let existingItem: Partial<TypeInfoDataItem> | undefined;
        try {
          existingItem = await driver.readItem(primaryFieldValue);
        } catch (error: any) {
          if (error?.message !== DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND) {
            throw error;
          }
        }
        const result = await driver.updateItem(
          primaryFieldValue,
          cleanItem,
          updateConfig,
        );
        const updatedItem = await driver.readItem(primaryFieldValue);

        if (existingItem) {
          await this.replaceItemIndexes(typeName, existingItem, updatedItem);
        } else {
          await this.indexItemIndexes(typeName, updatedItem);
        }

        return result;
      }
    }
  };

  /**
   * Delete an existing item of the given type.
   * @param typeName Type name to delete.
   * @param primaryFieldValue Primary field value to delete.
   * @returns True when the delete succeeded.
   * */
  delete = async (
    typeName: string,
    primaryFieldValue: any,
    context?: TypeInfoORMContext,
  ): Promise<boolean> => {
    this.validateDeleteOperation(typeName, primaryFieldValue);
    const driver = this.getDriverInternal(typeName);
    const existingItem = await driver.readItem(primaryFieldValue);
    const { allowed: deleteAllowed, denied: deleteDenied } =
      await this.getItemDACValidation(
        existingItem,
        typeName,
        TypeOperation.DELETE,
        context,
      );

    if (deleteDenied || !deleteAllowed) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        typeName,
        primaryFieldValue,
      };
    } else {
      const result = await driver.deleteItem(primaryFieldValue);

      await this.cleanupRelationships({
        fromTypeName: typeName,
        fromTypePrimaryFieldValue: primaryFieldValue,
      });
      await this.removeItemIndexes(typeName, existingItem);

      return result;
    }
  };

  /**
   * List items of the given type, with the given criteria.
   * @param typeName Type name to list.
   * @param config List configuration and criteria.
   * @param selectedFields Optional fields to select.
   * @returns List results with items and cursor.
   * */
  list = async (
    typeName: string,
    config: ListItemsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
    context?: TypeInfoORMContext,
  ): Promise<ListItemsResults<Partial<TypeInfoDataItem>>> => {
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );

    this.validateReadOperation(typeName, cleanSelectedFields);

    const { typeInfoMap, useDAC, indexing } = this.config;
    const typeInfo = this.getTypeInfo(typeName);
    const { fields: {} = {} } = typeInfo;
    const { criteria, itemsPerPage, cursor, sortFields } = config;
    const { fieldCriteria = [] }: Partial<SearchCriteria> = criteria || {};
    const searchFieldValidationResults = validateSearchFields(
      typeName,
      typeInfoMap,
      fieldCriteria,
      true,
    );
    const { valid: searchFieldsValid } = searchFieldValidationResults;

    if (searchFieldsValid) {
      const hasCriteria = !!criteria && fieldCriteria.length > 0;

      if (hasCriteria && indexing?.backend) {
        try {
          const expression = criteriaToIndexExpression(
            typeName,
            criteria,
            this.getIndexedFieldCapabilities(typeName),
          );
          if (!expression) {
            throw {
              message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
              typeName,
            };
          }

          const orderBy = this.resolveIndexOrderBy(typeName, sortFields);
          let page = await searchIndex(indexing.backend, expression, {
            limit: itemsPerPage,
            cursor,
            orderBy,
            occupancyFields:
              this.buildIndexWriteContext(typeName).occupancyFields,
            tokenizer: indexing.tokenizer,
            limits: indexing.limits,
            planFingerprintParts: indexing.fieldsByType?.[typeName],
          });
          this.emitListRoutingDecision(
            typeName,
            "indexed",
            "indexedExpression",
            fieldCriteria.length,
            page.diagnostics,
          );

          const driver = this.getDriverInternal(typeName);
          const items: Partial<TypeInfoDataItem>[] = [];
          const fieldsResourcesCache: Record<string, DACAccessResult>[] = [];

          while (true) {
            for (const docId of page.candidateIds) {
              try {
                const item = await driver.readItem(
                  docId as any,
                  page.requiresCanonicalVerification || useDAC
                    ? undefined
                    : cleanSelectedFields,
                );

                if (
                  page.requiresCanonicalVerification &&
                  !doesTypeInfoDataItemMatchSearchCriteria(
                    criteria,
                    item,
                    typeName,
                    typeInfoMap,
                  )
                ) {
                  continue;
                }

                if (useDAC) {
                  const {
                    allowed: readAllowed,
                    denied: readDenied,
                    fieldsResources = {},
                  } = await this.getItemDACValidation(
                    item,
                    typeName,
                    TypeOperation.READ,
                    context,
                  );
                  const listDenied = readDenied || !readAllowed;

                  if (listDenied) {
                    continue;
                  }

                  fieldsResourcesCache.push(fieldsResources);
                }

                items.push(item);
              } catch (error: any) {
                if (
                  error?.message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND
                ) {
                  continue;
                }
                throw error;
              }
            }

            if (items.length >= (itemsPerPage ?? 10) || !page.cursor) {
              break;
            }

            page = await searchIndex(indexing.backend, expression, {
              limit: (itemsPerPage ?? 10) - items.length,
              cursor: page.cursor,
              orderBy,
              occupancyFields:
                this.buildIndexWriteContext(typeName).occupancyFields,
              tokenizer: indexing.tokenizer,
              limits: indexing.limits,
              planFingerprintParts: indexing.fieldsByType?.[typeName],
            });
          }

          const cleanedItems = items.map((item, index) => {
            const fieldsResources = useDAC
              ? fieldsResourcesCache[index]
              : undefined;

            return this.getCleanItem(
              typeName,
              item,
              fieldsResources,
              cleanSelectedFields,
            );
          });
          return {
            items: cleanedItems,
            cursor: page.cursor,
          };
        } catch (error: any) {
          const isUnsupportedQuery =
            error instanceof IndexQueryError &&
            (error.code === IndexQueryErrorCode.UNSUPPORTED_EXPRESSION ||
              error.code === IndexQueryErrorCode.UNSUPPORTED_ORDER);
          if (
            error?.message !==
              TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA &&
            error?.message !==
              TypeInfoORMServiceError.INDEXING_UNSUPPORTED_COMBINATION &&
            error?.message !== STRUCTURED_OPTIONAL_ORDER_REQUIRES_OCCUPANCY &&
            !isUnsupportedQuery
          ) {
            throw error;
          }
          if (!indexing.allowFullScanFallback) {
            throw error;
          }
          this.emitListRoutingDecision(
            typeName,
            "fullScanCompare",
            "indexedPathFailedOrUnsupported",
            fieldCriteria.length,
          );
          return this.listByFullScanAndCompare(
            typeName,
            config,
            cleanSelectedFields,
            useDAC,
            context,
          );
        }
      }

      if (hasCriteria) {
        this.emitListRoutingDecision(
          typeName,
          "fullScanCompare",
          "criteriaWithoutIndexedPath",
          fieldCriteria.length,
        );
        return this.listByFullScanAndCompare(
          typeName,
          config,
          cleanSelectedFields,
          useDAC,
          context,
        );
      }

      this.emitListRoutingDecision(
        typeName,
        "canonicalDriverList",
        "noCriteria",
        0,
      );
      const driver = this.getDriverInternal(typeName);
      const fieldsResourcesCache: Record<string, DACAccessResult>[] = [];
      const results = await executeDriverListItems(
        driver,
        config,
        useDAC
          ? async (item: Partial<TypeInfoDataItem>): Promise<boolean> => {
              const {
                allowed: readAllowed,
                denied: readDenied,
                fieldsResources = {},
              } = await this.getItemDACValidation(
                item,
                typeName,
                TypeOperation.READ,
                context,
              );
              const listDenied = readDenied || !readAllowed;

              if (!listDenied) {
                fieldsResourcesCache.push(fieldsResources);
              }

              return !listDenied;
            }
          : undefined,
        (item: Partial<TypeInfoDataItem>): Partial<TypeInfoDataItem> => {
          const fieldsResources: Record<string, DACAccessResult> | undefined =
            fieldsResourcesCache[fieldsResourcesCache.length - 1];

          return this.getCleanItem(
            typeName,
            item,
            fieldsResources,
            cleanSelectedFields,
          );
        },
        cleanSelectedFields,
      );

      return results;
    } else {
      throw searchFieldValidationResults;
    }
  };
}
