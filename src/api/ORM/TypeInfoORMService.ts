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
  searchExact,
  searchLossy,
} from "../Indexing/API";
import { qualifyIndexField } from "../Indexing/fieldQualification";
import type { IndexBackend } from "../Indexing/Types";
import {
  searchStructured,
  type StructuredSearchDependencies,
} from "../Indexing/structured/SearchStructured";
import type { StructuredWriter } from "../Indexing/structured/Handlers";
import type { ResolvedSearchLimits } from "../Indexing/Handler/Config";
import { normalizeDocId } from "../Indexing/docId";
import type { StructuredDocFieldsRecord } from "../Indexing/structured/StructuredDdb";
import type { Where, WhereValue } from "../Indexing/structured/Types";
import type { StructuredStringTokenizerConfig } from "../Indexing/structured/StructuredStringLike";
import {
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "../../common/SearchUtils";
import { DATA_ITEM_DB_DRIVER_ERRORS } from "./drivers/common";
import { criteriaToStructuredWhere } from "./indexing/criteriaToStructuredWhere";
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

/**
 * Wrap a driver method to attach extra fields to thrown errors.
 * @returns Wrapped driver method with extended error data.
 * */
export const getDriverMethodWithModifiedError = <
  ItemType extends TypeInfoDataItem,
  UniquelyIdentifyingFieldName extends keyof ItemType,
  DriverMethodNameType extends keyof DataItemDBDriver<
    ItemType,
    UniquelyIdentifyingFieldName
  >,
  MethodType extends DataItemDBDriver<
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
  /**
   * Full text indexing configuration.
   */
  fullText?: {
    /**
     * Backend used for full text indexing.
     */
    backend: IndexBackend;
    /**
     * Default index field name(s) by type.
     */
    defaultIndexFieldByType?: Record<string, string | string[]>;
  };
  /**
   * Structured indexing configuration.
   */
  structured?: {
    /**
     * Reader used for structured queries.
     */
    reader: StructuredSearchDependencies;
    /**
     * Optional writer for structured indexing.
     */
    writer?: StructuredWriter;
    /**
     * Explicitly indexed field names by type. Fields not listed are excluded
     * from structured indexing and structured query routing.
     */
    indexedFieldsByType?: Record<string, string[]>;
    /**
     * Optional tokenizer overrides for structured string contains/LIKE behavior.
     */
    tokenizer?: Partial<StructuredStringTokenizerConfig>;
    /**
     * Field name mapping per type.
     */
    fieldMapByType?: Record<string, Record<string, string>>;
  };
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
  limits?: ResolvedSearchLimits;
  /**
   * Optional observability hooks for indexing/routing diagnostics.
   */
  observability?: {
    /**
     * Called when list routing chooses a query execution path.
     */
    onListRoutingDecision?: (event: {
      typeName: string;
      path: "fullText" | "structured" | "fullScanCompare";
      reason:
        | "fullTextPlan"
        | "structuredEligible"
        | "criteriaWithoutIndexedPath"
        | "indexedPathFailedOrUnsupported";
      criteriaCount: number;
    }) => void;
    /**
     * Called when structured indexing writes/removes document entries.
     */
    onStructuredIndexWrite?: (event: {
      typeName: string;
      docId: string;
      action: "upsert" | "remove";
      indexedFieldCount: number;
    }) => void;
  };
};

/**
 * Optional field overrides for manual indexing maintenance operations.
 */
export type TypeInfoORMManualIndexingConfig = {
  /**
   * Explicit full-text field name(s) to target instead of the configured defaults.
   *
   * Supply the previous field set when cleaning up after a schema/config change.
   */
  fullTextIndexFields?: string | string[];
};

/**
 * Optional field overrides for manual index replacement/reindex operations.
 */
export type TypeInfoORMReplaceIndexingConfig = {
  /**
   * Full-text field name(s) to remove from the previous snapshot.
   */
  previousFullTextIndexFields?: string | string[];
  /**
   * Full-text field name(s) to add for the next snapshot.
   */
  nextFullTextIndexFields?: string | string[];
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
     * full-text fields before the current item is reindexed.
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
    path: "fullText" | "structured" | "fullScanCompare",
    /**
     * Why this path was selected.
     */
    reason:
      | "fullTextPlan"
      | "structuredEligible"
      | "criteriaWithoutIndexedPath"
      | "indexedPathFailedOrUnsupported",
    /**
     * Number of criteria considered.
     */
    criteriaCount: number,
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
      });
    } catch (_error) {
      // Observability hooks must never alter ORM behavior.
    }
  };

  /**
   * Emit structured index write observability events without impacting behavior.
   */
  protected emitStructuredIndexWrite = (
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
    indexedFieldCount: number,
  ): void => {
    const hook = this.config.indexing?.observability?.onStructuredIndexWrite;

    if (!hook) {
      return;
    }

    try {
      hook({ typeName, docId, action, indexedFieldCount });
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

    const rootRole = await dacConfig.getDACRoleById(
      context.accessingRoleId,
    );

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
      const itemPrefix = [
        ...itemResourcePathPrefix,
        ...(ownerPrefix ?? []),
      ];

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

    const {
      fromTypeName,
      fromTypePrimaryFieldValue,
      toTypePrimaryFieldValue,
    } = relationshipItem;
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
    const driverMethodList: (keyof DataItemDBDriver<any, any>)[] = [
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

  /**
   * @returns Resolved full-text index field names.
   */
  protected resolveFullTextIndexFields = (
    /**
     * Type name used to resolve the default index field(s).
     */
    typeName: string,
    /**
     * Optional override for the index field.
     */
    override?: string | string[],
  ): string[] => {
    if (typeof override === "string") {
      return this.resolveFullTextIndexFields(typeName, [override]);
    }

    if (Array.isArray(override)) {
      const seen = new Set<string>();
      const fields: string[] = [];

      for (const field of override) {
        if (typeof field !== "string") {
          continue;
        }

        const trimmed = field.trim();

        if (!trimmed || seen.has(trimmed)) {
          continue;
        }

        seen.add(trimmed);
        fields.push(trimmed);
      }

      return fields;
    }

    const defaults =
      this.config.indexing?.fullText?.defaultIndexFieldByType?.[typeName];

    if (typeof defaults === "string") {
      return [defaults];
    }

    if (!Array.isArray(defaults)) {
      return [];
    }

    const seen = new Set<string>();
    const fields: string[] = [];

    for (const field of defaults) {
      if (typeof field !== "string") {
        continue;
      }

      const trimmed = field.trim();

      if (!trimmed || seen.has(trimmed)) {
        continue;
      }

      seen.add(trimmed);
      fields.push(trimmed);
    }

    return fields;
  };

  /**
   * @returns True when the operator maps to full-text search.
   */
  protected isFullTextSearchOperator = (
    /**
     * Operator to evaluate.
     */
    operator: ComparisonOperators,
  ): boolean =>
    operator === ComparisonOperators.LIKE ||
    operator === ComparisonOperators.CONTAINS ||
    operator === ComparisonOperators.STARTS_WITH;

  /**
   * @returns Explicitly indexed structured field names for a type.
   */
  protected resolveStructuredIndexedFields = (
    /**
     * Type name used to resolve indexed structured fields.
     */
    typeName: string,
  ): Set<string> => {
    const configured =
      this.config.indexing?.structured?.indexedFieldsByType?.[typeName];

    if (!Array.isArray(configured)) {
      return new Set<string>();
    }

    const fields = new Set<string>();

    for (const field of configured) {
      if (typeof field !== "string") {
        continue;
      }

      const trimmed = field.trim();

      if (trimmed) {
        fields.add(trimmed);
      }
    }

    return fields;
  };

  /**
   * @returns True when the field type and operator can be served by structured indexing.
   */
  protected isStructuredOperatorSupportedForField = (
    /**
     * Field definition from TypeInfo.
     */
    field: TypeInfoField,
    /**
     * Search operator to evaluate.
     */
    operator: ComparisonOperators,
  ): boolean => {
    const { array: isArray = false, type } = field;

    if (isArray) {
      return operator === ComparisonOperators.CONTAINS;
    }

    if (type === "string") {
      return (
        operator === ComparisonOperators.EQUALS ||
        operator === ComparisonOperators.IN ||
        operator === ComparisonOperators.LIKE ||
        operator === ComparisonOperators.GREATER_THAN_OR_EQUAL ||
        operator === ComparisonOperators.LESS_THAN_OR_EQUAL ||
        operator === ComparisonOperators.BETWEEN
      );
    }

    if (type === "number") {
      return (
        operator === ComparisonOperators.EQUALS ||
        operator === ComparisonOperators.IN ||
        operator === ComparisonOperators.GREATER_THAN_OR_EQUAL ||
        operator === ComparisonOperators.LESS_THAN_OR_EQUAL ||
        operator === ComparisonOperators.BETWEEN
      );
    }

    if (type === "boolean") {
      return (
        operator === ComparisonOperators.EQUALS ||
        operator === ComparisonOperators.IN
      );
    }

    return false;
  };

  /**
   * @returns True when criteria can be evaluated using structured indexing.
   */
  protected canUseStructuredIndexForCriteria = (
    /**
     * Type being listed.
     */
    typeName: string,
    /**
     * Criteria to evaluate.
     */
    criteria?: SearchCriteria,
  ): boolean => {
    if (!criteria?.fieldCriteria?.length) {
      return false;
    }

    const typeInfo = this.getTypeInfo(typeName);
    const { fields = {} } = typeInfo;
    const indexedFields = this.resolveStructuredIndexedFields(typeName);

    if (indexedFields.size === 0) {
      return false;
    }

    for (const criterion of criteria.fieldCriteria) {
      const { fieldName } = criterion;
      const field = fields[fieldName];

      if (!field || field.typeReference || !indexedFields.has(fieldName)) {
        return false;
      }

      const operator = criterion.operator ?? ComparisonOperators.EQUALS;

      if (!this.isStructuredOperatorSupportedForField(field, operator)) {
        return false;
      }
    }

    return true;
  };

  /**
   * @returns Full-text query plan derived from a field criterion.
   */
  protected toFullTextSearchPlan = (
    /**
     * Criterion to map.
     */
    criterion: FieldCriterion,
  ):
    | {
        mode: "lossy" | "exact";
        query: string;
      }
    | undefined => {
    const operator = criterion.operator ?? ComparisonOperators.EQUALS;

    if (!this.isFullTextSearchOperator(operator)) {
      return undefined;
    }

    if (typeof criterion.value !== "string") {
      throw {
        message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
        operator,
        fieldName: criterion.fieldName,
      };
    }

    const query = criterion.value.trim();

    if (!query) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
        operator,
        fieldName: criterion.fieldName,
      };
    }

    if (operator === ComparisonOperators.CONTAINS) {
      return {
        mode: "exact",
        query,
      };
    }

    if (operator === ComparisonOperators.STARTS_WITH) {
      return {
        mode: "lossy",
        query: `${query}*`,
      };
    }

    return {
      mode: "lossy",
      query,
    };
  };

  /**
   * @returns Auto full-text search plan for list criteria, if applicable.
   */
  protected resolveAutoFullTextCriteriaPlan = (
    /**
     * Type being listed.
     */
    typeName: string,
    /**
     * Search criteria from list config.
     */
    criteria?: SearchCriteria,
  ):
    | {
        mode: "lossy" | "exact";
        query: string;
        indexField: string;
      }
    | undefined => {
    if (!criteria?.fieldCriteria?.length) {
      return undefined;
    }

    const configuredIndexFields = new Set(
      this.resolveFullTextIndexFields(typeName),
    );

    if (configuredIndexFields.size === 0) {
      return undefined;
    }

    const fullTextCandidates: Array<{
      mode: "lossy" | "exact";
      query: string;
      indexField: string;
    }> = [];
    let hasNonFullTextCriteria = false;

    for (const criterion of criteria.fieldCriteria) {
      const indexField = criterion.fieldName;

      if (!configuredIndexFields.has(indexField)) {
        hasNonFullTextCriteria = true;
        continue;
      }

      const plan = this.toFullTextSearchPlan(criterion);

      if (!plan) {
        hasNonFullTextCriteria = true;
        continue;
      }

      fullTextCandidates.push({
        ...plan,
        indexField,
      });
    }

    if (fullTextCandidates.length === 0) {
      return undefined;
    }

    if (
      hasNonFullTextCriteria ||
      fullTextCandidates.length > 1 ||
      criteria.logicalOperator === LogicalOperators.OR
    ) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_COMBINATION,
        typeName,
      };
    }

    return fullTextCandidates[0];
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
        this.getCleanItem(
          typeName,
          item,
          fieldsResources,
          cleanSelectedFields,
        ),
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
  protected isStructuredValue = (value: unknown): value is WhereValue =>
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean";

  /**
   * @returns Structured fields record for indexing.
   */
  protected buildStructuredFields = (
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
    const fieldMap =
      this.config.indexing?.structured?.fieldMapByType?.[typeName];
    const indexedFields = this.resolveStructuredIndexedFields(typeName);
    const withoutRefs = removeTypeReferenceFieldsFromDataItem(typeInfo, item);
    const fields: StructuredDocFieldsRecord = {};

    for (const [fieldName, value] of Object.entries(withoutRefs)) {
      if (!indexedFields.has(fieldName)) {
        continue;
      }

      if (typeof value === "undefined") {
        continue;
      }

      const mappedField = fieldMap?.[fieldName] ?? fieldName;
      const qualifiedField = qualifyIndexField(typeName, mappedField);

      if (Array.isArray(value)) {
        const filtered = value.filter((entry) => this.isStructuredValue(entry));
        if (filtered.length > 0) {
          fields[qualifiedField] = filtered as WhereValue[];
        }
        continue;
      }

      if (this.isStructuredValue(value)) {
        fields[qualifiedField] = value;
      }
    }

    return fields;
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
   * @returns Mapped structured query.
   */
  protected applyStructuredFieldMap = (
    /**
     * Type name used for field qualification.
     */
    typeName: string,
    /**
     * Structured query to map.
     */
    where: Where,
    /**
     * Optional field mapping by type.
     */
    fieldMap?: Record<string, string>,
  ): Where => {
    if ("and" in where) {
      return {
        and: where.and.map((child) =>
          this.applyStructuredFieldMap(typeName, child, fieldMap),
        ),
      };
    }

    if ("or" in where) {
      return {
        or: where.or.map((child) =>
          this.applyStructuredFieldMap(typeName, child, fieldMap),
        ),
      };
    }

    const mappedField = fieldMap?.[where.field] ?? where.field;
    const qualifiedField = qualifyIndexField(typeName, mappedField);

    if (where.type === "term") {
      return { ...where, field: qualifiedField };
    }

    return { ...where, field: qualifiedField };
  };

  /**
   * @returns Promise resolved once indexing is complete.
   */
  protected async indexFullTextDocument(
    /**
     * Type name for index field resolution.
     */
    typeName: string,
    /**
     * Item to index.
     */
    item: Partial<TypeInfoDataItem>,
    /**
     * Optional override for the index field.
     */
    indexFieldOverride?: string | string[],
  ): Promise<void> {
    const { fullText } = this.config.indexing ?? {};
    const indexFields = this.resolveFullTextIndexFields(
      typeName,
      indexFieldOverride,
    );

    if (!fullText || indexFields.length === 0) {
      return;
    }
    const { primaryField } = this.getTypeInfo(typeName);

    for (const indexField of indexFields) {
      const qualifiedIndexField = qualifyIndexField(typeName, indexField);

      await indexDocument({
        backend: fullText.backend,
        document: item,
        primaryField: String(primaryField),
        indexField,
        indexFieldQualified: qualifiedIndexField,
      });
    }
  }

  /**
   * @returns Promise resolved once removal is complete.
   */
  protected async removeFullTextDocument(
    /**
     * Type name for index field resolution.
     */
    typeName: string,
    /**
     * Item to remove from the index.
     */
    item: Partial<TypeInfoDataItem>,
    /**
     * Optional override for the index field.
     */
    indexFieldOverride?: string | string[],
  ): Promise<void> {
    const { fullText } = this.config.indexing ?? {};
    const indexFields = this.resolveFullTextIndexFields(
      typeName,
      indexFieldOverride,
    );

    if (!fullText || indexFields.length === 0) {
      return;
    }
    const { primaryField } = this.getTypeInfo(typeName);

    for (const indexField of indexFields) {
      const qualifiedIndexField = qualifyIndexField(typeName, indexField);

      await removeDocument({
        backend: fullText.backend,
        document: item,
        primaryField: String(primaryField),
        indexField,
        indexFieldQualified: qualifiedIndexField,
      });
    }
  }

  /**
   * @returns Promise resolved once replacement is complete.
   */
  protected async replaceFullTextDocument(
    /**
     * Type name for index field resolution.
     */
    typeName: string,
    /**
     * Previous item state to remove from the index.
     */
    previousItem: Partial<TypeInfoDataItem>,
    /**
     * Next item state to index.
     */
    nextItem: Partial<TypeInfoDataItem>,
    /**
     * Optional override for the index field.
     */
    indexFieldOverride?: string | string[],
  ): Promise<void> {
    const { fullText } = this.config.indexing ?? {};
    const indexFields = this.resolveFullTextIndexFields(
      typeName,
      indexFieldOverride,
    );

    if (!fullText || indexFields.length === 0) {
      return;
    }
    const { primaryField } = this.getTypeInfo(typeName);

    for (const indexField of indexFields) {
      const qualifiedIndexField = qualifyIndexField(typeName, indexField);

      await replaceFullTextDocumentIndex({
        backend: fullText.backend,
        previousDocument: previousItem,
        nextDocument: nextItem,
        primaryField: String(primaryField),
        indexField,
        indexFieldQualified: qualifiedIndexField,
      });
    }
  }

  /**
   * Write the provided item snapshot into the configured indexes.
   *
   * Use this when data was created or modified outside `TypeInfoORMService`.
   *
   * @param typeName Type name for the indexed item.
   * @param item Item snapshot to index.
   * @param config Optional full-text field overrides.
   * @returns Promise resolved when manual indexing completes.
   */
  indexItemIndexes = async (
    typeName: string,
    item: Partial<TypeInfoDataItem>,
    config: TypeInfoORMManualIndexingConfig = {},
  ): Promise<void> => {
    const indexedItem = this.getIndexedItemSnapshot(typeName, item);

    await this.indexFullTextDocument(
      typeName,
      indexedItem,
      config.fullTextIndexFields,
    );
    await this.indexStructuredDocument(typeName, indexedItem);
  };

  /**
   * Remove the provided item snapshot from the configured indexes.
   *
   * Use this when data was deleted outside `TypeInfoORMService`.
   *
   * @param typeName Type name for the indexed item.
   * @param item Item snapshot to remove from the indexes.
   * @param config Optional full-text field overrides.
   * @returns Promise resolved when index cleanup completes.
   */
  removeItemIndexes = async (
    typeName: string,
    item: Partial<TypeInfoDataItem>,
    config: TypeInfoORMManualIndexingConfig = {},
  ): Promise<void> => {
    const indexedItem = this.getIndexedItemSnapshot(typeName, item);

    await this.removeFullTextDocument(
      typeName,
      indexedItem,
      config.fullTextIndexFields,
    );
    await this.removeStructuredDocument(typeName, indexedItem);
  };

  /**
   * Replace one indexed item snapshot with another.
   *
   * Use this when an existing stored item changed outside `TypeInfoORMService`
   * or when a schema/config change requires removing old full-text fields and
   * indexing a new field set.
   *
   * @param typeName Type name for the indexed item.
   * @param previousItem Previous item snapshot to remove.
   * @param nextItem Next item snapshot to index.
   * @param config Optional previous/next full-text field overrides.
   * @returns Promise resolved when replacement indexing completes.
   */
  replaceItemIndexes = async (
    typeName: string,
    previousItem: Partial<TypeInfoDataItem>,
    nextItem: Partial<TypeInfoDataItem>,
    config: TypeInfoORMReplaceIndexingConfig = {},
  ): Promise<void> => {
    const previousIndexedItem = this.getIndexedItemSnapshot(typeName, previousItem);
    const nextIndexedItem = this.getIndexedItemSnapshot(typeName, nextItem);

    await this.removeFullTextDocument(
      typeName,
      previousIndexedItem,
      config.previousFullTextIndexFields,
    );
    await this.indexFullTextDocument(
      typeName,
      nextIndexedItem,
      config.nextFullTextIndexFields,
    );
    await this.indexStructuredDocument(typeName, nextIndexedItem);
  };

  /**
   * Reindex the current stored item using the configured driver.
   *
   * When no previous snapshot is supplied, the current stored item is used for
   * both removal and indexing to refresh existing postings without duplication.
   * Supply `previousItem` when an out-of-band update changed indexed field
   * values, otherwise old full-text tokens cannot be removed safely.
   *
   * @param typeName Type name to reindex.
   * @param primaryFieldValue Primary field value for the stored item.
   * @param config Optional previous snapshot and full-text field overrides.
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
      previousFullTextIndexFields: config.previousFullTextIndexFields,
      nextFullTextIndexFields: config.nextFullTextIndexFields,
    });

    return true;
  };

  /**
   * Reindex all currently stored items for a type.
   *
   * This is intended for maintenance passes after out-of-band writes or
   * schema/index configuration changes. Deleted items still require explicit
   * cleanup via {@link removeItemIndexes}, because full-text token removal
   * needs a prior snapshot of indexed field values. For out-of-band updates
   * that changed indexed values, provide `previousItemsByPrimaryField`.
   *
   * @param typeName Type name to reindex.
   * @param config Paging, previous snapshots, and full-text field overrides.
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
          config.previousItemsByPrimaryField?.[String(primaryFieldValue)] ?? item;

        await this.replaceItemIndexes(typeName, previousItem, item, {
          previousFullTextIndexFields: config.previousFullTextIndexFields,
          nextFullTextIndexFields: config.nextFullTextIndexFields,
        });
        processedCount += 1;
      }

      cursor = page.cursor;
    } while (cursor);

    return { processedCount };
  };

  /**
   * @returns Promise resolved once indexing is complete.
   */
  protected async indexStructuredDocument(
    /**
     * Type name for field mapping.
     */
    typeName: string,
    /**
     * Item to index.
     */
    item: Partial<TypeInfoDataItem>,
  ): Promise<void> {
    const { structured } = this.config.indexing ?? {};

    if (!structured) {
      return;
    }

    if (!structured.writer) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_MISSING_BACKEND,
        typeName,
        backend: "structured.writer",
      };
    }

    const { primaryField } = this.getTypeInfo(typeName);
    const primaryFieldName = String(primaryField);
    const docId = normalizeDocId(
      item[primaryFieldName as keyof TypeInfoDataItem],
      primaryFieldName,
    );
    const fields = this.buildStructuredFields(typeName, item);
    this.emitStructuredIndexWrite(
      typeName,
      String(docId),
      "upsert",
      Object.keys(fields).length,
    );

    await structured.writer.write(docId, fields);
  }

  /**
   * @returns Promise resolved once removal is complete.
   */
  protected async removeStructuredDocument(
    /**
     * Type name for field mapping.
     */
    typeName: string,
    /**
     * Item to remove from the structured index.
     */
    item: Partial<TypeInfoDataItem>,
  ): Promise<void> {
    const { structured } = this.config.indexing ?? {};

    if (!structured) {
      return;
    }

    if (!structured.writer) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_MISSING_BACKEND,
        typeName,
        backend: "structured.writer",
      };
    }

    const { primaryField } = this.getTypeInfo(typeName);
    const primaryFieldName = String(primaryField);
    const docId = normalizeDocId(
      item[primaryFieldName as keyof TypeInfoDataItem],
      primaryFieldName,
    );
    this.emitStructuredIndexWrite(typeName, String(docId), "remove", 0);

    await structured.writer.write(docId, {});
  }

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

    if (!operationValid && operationError.code !== ERROR_MESSAGE_CONSTANTS.NONE) {
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
              getErrorDescriptor(TypeInfoORMServiceError.INVALID_UPDATE_OPERATOR),
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
          error: getErrorDescriptor(TypeInfoORMServiceError.INVALID_RELATIONSHIP),
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
      fields: {
        [fromTypeFieldName]: { typeReference = undefined } = {},
      } = {},
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

    if (createDenied || !createAllowed || endpointsDenied || !endpointsAllowed) {
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
      fields: {
        [fromTypeFieldName]: { typeReference = undefined } = {},
      } = {},
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

    if (deleteDenied || !deleteAllowed || endpointsDenied || !endpointsAllowed) {
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
  create = async (
    typeName: string,
    item: TypeInfoDataItem,
  ): Promise<any> => {
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
          if (
            error?.message !== DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND
          ) {
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
    const { primaryField } = this.getTypeInfo(typeName);
    const itemWithPrimaryFieldOnly: TypeInfoDataItem = {
      [primaryField as keyof TypeInfoDataItem]: primaryFieldValue,
    };
    this.validate(typeName, itemWithPrimaryFieldOnly, TypeOperation.DELETE);
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
      const hasStructured = !!indexing?.structured?.reader;
      const hasFullText = !!indexing?.fullText?.backend;
      const hasCriteria = !!criteria && fieldCriteria.length > 0;

      if (hasCriteria && (hasStructured || hasFullText)) {
        try {
          let docIds: Array<string | number> = [];
          let nextCursor: string | undefined = undefined;

          const fullTextPlan = this.resolveAutoFullTextCriteriaPlan(
            typeName,
            criteria,
          );

          if (fullTextPlan && hasFullText) {
            this.emitListRoutingDecision(
              typeName,
              "fullText",
              "fullTextPlan",
              fieldCriteria.length,
            );

            const qualifiedIndexField = qualifyIndexField(
              typeName,
              fullTextPlan.indexField,
            );
            const fullTextBackend = indexing?.fullText?.backend;
            const searchResult =
              fullTextPlan.mode === "exact"
                ? await searchExact({
                    backend: fullTextBackend,
                    query: fullTextPlan.query,
                    indexField: qualifiedIndexField,
                    limit: itemsPerPage,
                    cursor,
                    limits: indexing?.limits,
                  })
                : await searchLossy({
                    backend: fullTextBackend,
                    query: fullTextPlan.query,
                    indexField: qualifiedIndexField,
                    limit: itemsPerPage,
                    cursor,
                    limits: indexing?.limits,
                  });

            docIds = searchResult.docIds;
            nextCursor = searchResult.nextCursor;
          } else if (hasStructured) {
            if (!this.canUseStructuredIndexForCriteria(typeName, criteria)) {
              throw {
                message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
                typeName,
              };
            }
            this.emitListRoutingDecision(
              typeName,
              "structured",
              "structuredEligible",
              fieldCriteria.length,
            );

            const tokenizer = indexing?.structured?.tokenizer;
            const whereWithTokenizer = criteriaToStructuredWhere(
              criteria,
              tokenizer,
            );

            if (!whereWithTokenizer) {
              throw {
                message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
                typeName,
              };
            }

            const mappedWhere = this.applyStructuredFieldMap(
              typeName,
              whereWithTokenizer,
              indexing?.structured?.fieldMapByType?.[typeName],
            );
            const structuredReader = indexing?.structured?.reader;
            const page = await searchStructured(
              structuredReader as StructuredSearchDependencies,
              mappedWhere,
              {
                limit: itemsPerPage,
                cursor,
              },
            );

            docIds = page.candidateIds;
            nextCursor = page.cursor;
          } else {
            throw {
              message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
              typeName,
            };
          }

          const driver = this.getDriverInternal(typeName);
          const items: Partial<TypeInfoDataItem>[] = [];
          const fieldsResourcesCache: Record<string, DACAccessResult>[] = [];

          for (const docId of docIds) {
            try {
              const item = await driver.readItem(
                docId as any,
                useDAC ? undefined : cleanSelectedFields,
              );

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
          const sortedItems = getSortedItems(
            sortFields,
            cleanedItems as TypeInfoDataItem[],
          );

          return {
            items: sortedItems as Partial<TypeInfoDataItem>[],
            cursor: nextCursor,
          };
        } catch (_error) {
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
