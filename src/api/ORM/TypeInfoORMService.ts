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
  getValidityValue,
  RelationshipValidationType,
  TypeInfoValidationResults,
  validateTypeInfoValue,
  validateTypeOperationAllowed,
} from "../../common/TypeParsing/Validation";
import {
  ComparisonOperators,
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
  TypeInfoORMServiceError,
} from "../../common/TypeInfoORM";
import { IndexingRelationshipDriver, DataItemDBDriver, ItemRelationshipDBDriver } from "./drivers";
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
import { indexDocument, removeDocument, searchExact, searchLossy } from "../Indexing/api";
import type { IndexBackend } from "../Indexing/types";
import { searchStructured, type StructuredSearchDependencies } from "../Indexing/structured/searchStructured";
import type { StructuredWriter } from "../Indexing/structured/handlers";
import type { ResolvedSearchLimits } from "../Indexing/handler/config";
import { normalizeDocId } from "../Indexing/docId";
import type { StructuredDocFieldsRecord } from "../Indexing/structured/structuredDdb";
import type { Where, WhereValue } from "../Indexing/structured/types";
import { getSortedItems } from "../../common/SearchUtils";
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
   */
  itemResourcePathPrefix: LiteralValue[];
  /**
   * DAC path prefix for relationship resources.
   */
  relationshipResourcePathPrefix: LiteralValue[];
  /**
   * Role used to evaluate access.
   */
  accessingRole: DACRole;
  /**
   * Lookup helper used to resolve roles by id.
   */
  getDACRoleById: (id: string) => DACRole;
};

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
     * Default index field names by type.
     */
    defaultIndexFieldByType?: Record<string, string>;
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
    relationNameFor: (fromTypeName: string, fromTypeFieldName: string) => string;
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

  protected getItemDACValidation = (
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
  ): DACDataItemResourceAccessResultMap => {
    const { useDAC } = this.config;

    if (useDAC) {
      const typeInfo = this.getTypeInfo(typeName);
      const { dacConfig } = this.config;
      const { itemResourcePathPrefix, accessingRole, getDACRoleById } =
        dacConfig;

      return mergeDACDataItemResourceAccessResultMaps(
        getDACRoleHasAccessToDataItem(
          itemResourcePathPrefix,
          typeOperation,
          typeName,
          item,
          typeInfo,
          accessingRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getDACRoleHasAccessToDataItem(
          itemResourcePathPrefix,
          OperationGroup.ALL_ITEM_OPERATIONS,
          typeName,
          item,
          typeInfo,
          accessingRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getDACRoleHasAccessToDataItem(
          itemResourcePathPrefix,
          OperationGroup.ALL_OPERATIONS,
          typeName,
          item,
          typeInfo,
          accessingRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
      );
    } else {
      return {
        allowed: true,
        denied: false,
        fieldsResources: {},
      };
    }
  };

  protected getRelationshipDACValidation = (
    /**
     * Relationship to evaluate for access.
     */
    itemRelationship: BaseItemRelationshipInfo,
    /**
     * Relationship operation being evaluated.
     */
    relationshipOperation: RelationshipOperation,
  ): DACAccessResult => {
    const { useDAC } = this.config;

    if (useDAC) {
      const { dacConfig } = this.config;
      const { relationshipResourcePathPrefix, accessingRole, getDACRoleById } =
        dacConfig;

      return mergeDACAccessResults(
        getResourceAccessByDACRole(
          getItemRelationshipDACResourcePath(
            relationshipResourcePathPrefix,
            relationshipOperation,
            itemRelationship,
          ),
          accessingRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getResourceAccessByDACRole(
          getItemRelationshipDACResourcePath(
            relationshipResourcePathPrefix,
            OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
            itemRelationship,
          ),
          accessingRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
        getResourceAccessByDACRole(
          getItemRelationshipDACResourcePath(
            relationshipResourcePathPrefix,
            OperationGroup.ALL_OPERATIONS,
            itemRelationship,
          ),
          accessingRole,
          getDACRoleById,
          this.dacRoleCache,
        ),
      );
    } else {
      return {
        allowed: true,
        denied: false,
      };
    }
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
  protected getIndexingRelationshipDriverInternal = (): IndexingRelationshipDriver => {
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
   * @returns Resolved index field name, if available.
   */
  protected resolveFullTextIndexField = (
    /**
     * Type name used to resolve the default index field.
     */
    typeName: string,
    /**
     * Optional override for the index field.
     */
    override?: string,
  ): string | undefined => {
    if (override) {
      return override;
    }

    return this.config.indexing?.fullText?.defaultIndexFieldByType?.[typeName];
  };

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
    const fieldMap = this.config.indexing?.structured?.fieldMapByType?.[typeName];
    const withoutRefs = removeTypeReferenceFieldsFromDataItem(typeInfo, item);
    const fields: StructuredDocFieldsRecord = {};

    for (const [fieldName, value] of Object.entries(withoutRefs)) {
      if (typeof value === "undefined") {
        continue;
      }

      const mappedField = fieldMap?.[fieldName] ?? fieldName;

      if (Array.isArray(value)) {
        const filtered = value.filter((entry) => this.isStructuredValue(entry));
        if (filtered.length > 0) {
          fields[mappedField] = filtered as WhereValue[];
        }
        continue;
      }

      if (this.isStructuredValue(value)) {
        fields[mappedField] = value;
      }
    }

    return fields;
  };

  /**
   * @returns Mapped structured query.
   */
  protected applyStructuredFieldMap = (
    /**
     * Structured query to map.
     */
    where: Where,
    /**
     * Optional field mapping by type.
     */
    fieldMap?: Record<string, string>,
  ): Where => {
    if (!fieldMap || Object.keys(fieldMap).length === 0) {
      return where;
    }

    if ("and" in where) {
      return { and: where.and.map((child) => this.applyStructuredFieldMap(child, fieldMap)) };
    }

    if ("or" in where) {
      return { or: where.or.map((child) => this.applyStructuredFieldMap(child, fieldMap)) };
    }

    const mappedField = fieldMap[where.field] ?? where.field;

    if (where.type === "term") {
      return { ...where, field: mappedField };
    }

    return { ...where, field: mappedField };
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
    indexFieldOverride?: string,
  ): Promise<void> {
    const { fullText } = this.config.indexing ?? {};
    const indexField = this.resolveFullTextIndexField(typeName, indexFieldOverride);

    if (!fullText || !indexField) {
      return;
    }

    const { primaryField } = this.getTypeInfo(typeName);

    if (!(indexField in item)) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_MISSING_INDEX_FIELD,
        typeName,
        indexField,
      };
    }

    await indexDocument({
      backend: fullText.backend,
      document: item,
      primaryField: String(primaryField),
      indexField,
    });
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
    indexFieldOverride?: string,
  ): Promise<void> {
    const { fullText } = this.config.indexing ?? {};
    const indexField = this.resolveFullTextIndexField(typeName, indexFieldOverride);

    if (!fullText || !indexField) {
      return;
    }

    const { primaryField } = this.getTypeInfo(typeName);

    if (!(indexField in item)) {
      throw {
        message: TypeInfoORMServiceError.INDEXING_MISSING_INDEX_FIELD,
        typeName,
        indexField,
      };
    }

    await removeDocument({
      backend: fullText.backend,
      document: item,
      primaryField: String(primaryField),
      indexField,
    });
  }

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
      error: !!typeInfo ? "" : ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST,
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

    if (!operationValid && operationError) {
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
    omitFields: ItemRelationshipInfoKeys[] = [],
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
          error: TypeInfoORMServiceError.INVALID_RELATIONSHIP,
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
   * @returns True when the relationship was created.
   * */
  createRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<boolean> => {
    this.validateRelationshipItem(relationshipItem);

    const { allowed: createAllowed, denied: createDenied } =
      this.getRelationshipDACValidation(
        relationshipItem,
        RelationshipOperation.SET,
      );

    if (createDenied || !createAllowed) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        relationshipItem,
      };
    } else {
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
   * @returns Deletion results including whether items remain.
   * */
  deleteRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<DeleteRelationshipResults> => {
    this.validateRelationshipItem(relationshipItem);

    const { allowed: deleteAllowed, denied: deleteDenied } =
      this.getRelationshipDACValidation(
        relationshipItem,
        RelationshipOperation.UNSET,
      );

    if (deleteDenied || !deleteAllowed) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        relationshipItem,
      };
    } else {
      const cleanedItem = cleanRelationshipItem(relationshipItem);
      const {
        fromTypeName,
        fromTypeFieldName,
        fromTypePrimaryFieldValue,
        toTypePrimaryFieldValue,
      } = cleanedItem;

      if (this.config.indexing?.relations) {
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
  ): Promise<ListItemsResults<ItemRelationshipInfo>> => {
    const { useDAC } = this.config;
    const { relationshipItemOrigin, ...remainingConfig } = config;
    this.validateRelationshipItem(relationshipItemOrigin);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
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
          this.getRelationshipDACValidation(
            rItm as ItemRelationshipInfo,
            RelationshipOperation.GET,
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
        await this.listRelationships(config);
      const items: Partial<TypeInfoDataItem>[] = [];

      for (const rItm of relationshipItems) {
        const { toTypePrimaryFieldValue } = rItm;
        const itm: Partial<TypeInfoDataItem> = await this.read(
          typeReference,
          toTypePrimaryFieldValue,
          selectedFields,
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

    const {
      allowed: createAllowed,
      denied: createDenied,
      fieldsResources = {},
    } = this.getItemDACValidation(item, typeName, TypeOperation.CREATE);

    if (createDenied || !createAllowed) {
      throw {
        message: TypeInfoORMServiceError.INVALID_OPERATION,
        typeName,
        item,
      };
    } else {
      const driver = this.getDriverInternal(typeName);
      const cleanItem = this.getCleanItem(typeName, item, fieldsResources);
      const newIdentifier = await driver.createItem(cleanItem);
      const { primaryField } = this.getTypeInfo(typeName);
      const indexedItem = {
        ...cleanItem,
        [primaryField as keyof TypeInfoDataItem]: newIdentifier,
      };

      await this.indexFullTextDocument(typeName, indexedItem);
      await this.indexStructuredDocument(typeName, indexedItem);

      return newIdentifier;
    }
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
    } = this.getItemDACValidation(item, typeName, TypeOperation.READ);

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
   * @returns True when the update succeeded.
   * */
  update = async (
    typeName: string,
    item: TypeInfoDataItem,
  ): Promise<boolean> => {
    this.validate(typeName, item, TypeOperation.UPDATE, true);

    const { primaryField } = this.getTypeInfo(typeName);
    const primaryFieldValue =
      typeof item === "object" && item !== null
        ? item[primaryField as keyof TypeInfoDataItem]
        : undefined;

    if (typeof primaryFieldValue === "undefined") {
      const validationResults: TypeInfoValidationResults = {
        typeName,
        valid: false,
        error: TypeInfoORMServiceError.NO_PRIMARY_FIELD_VALUE_SUPPLIED,
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
      } = this.getItemDACValidation(
        initialCleanItem,
        typeName,
        TypeOperation.UPDATE,
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
          this.getItemDACValidation(
            initialCleanItem,
            typeName,
            TypeOperation.DELETE,
          );
        const fieldsResourcesForUpdateOperationForNullFields = Object.keys(
          initialCleanItem,
        ).reduce(
          (acc, fN) => ({
            ...acc,
            // TRICKY: Remove delete fields for fields not being deleted.
            ...(initialCleanItem[fN] === null
              ? {
                  [fN]: fieldsResourcesForDeleteOperation[fN],
                }
              : undefined),
          }),
          {},
        );
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
        const result = await driver.updateItem(primaryFieldValue, cleanItem);
        const updatedItem = await driver.readItem(primaryFieldValue);

        await this.indexFullTextDocument(typeName, updatedItem);
        await this.indexStructuredDocument(typeName, updatedItem);

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
  ): Promise<boolean> => {
    const { primaryField } = this.getTypeInfo(typeName);
    const itemWithPrimaryFieldOnly: TypeInfoDataItem = {
      [primaryField as keyof TypeInfoDataItem]: primaryFieldValue,
    };
    this.validate(typeName, itemWithPrimaryFieldOnly, TypeOperation.DELETE);
    const driver = this.getDriverInternal(typeName);
    const existingItem = await driver.readItem(primaryFieldValue);
    const { allowed: deleteAllowed, denied: deleteDenied } =
      this.getItemDACValidation(existingItem, typeName, TypeOperation.DELETE);

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
      await this.removeFullTextDocument(typeName, existingItem);
      await this.removeStructuredDocument(typeName, existingItem);

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
  ): Promise<ListItemsResults<Partial<TypeInfoDataItem>>> => {
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );

    this.validateReadOperation(typeName, cleanSelectedFields);

    const { typeInfoMap, useDAC, indexing } = this.config;
    const typeInfo = this.getTypeInfo(typeName);
    const { fields: {} = {} } = typeInfo;
    const { criteria, text, itemsPerPage, cursor, sortFields } = config;
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
      const hasText = !!text;

      if (hasStructured || hasFullText) {
        if (!hasCriteria && !hasText) {
          throw {
            message: TypeInfoORMServiceError.INDEXING_REQUIRES_CRITERIA,
            typeName,
          };
        }

        if (hasCriteria && hasText) {
          throw {
            message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_COMBINATION,
            typeName,
          };
        }

        if (hasCriteria && !hasStructured) {
          throw {
            message: TypeInfoORMServiceError.INDEXING_MISSING_BACKEND,
            typeName,
            backend: "structured.reader",
          };
        }

        if (hasText && !hasFullText) {
          throw {
            message: TypeInfoORMServiceError.INDEXING_MISSING_BACKEND,
            typeName,
            backend: "fullText",
          };
        }

        let docIds: Array<string | number> = [];
        let nextCursor: string | undefined = undefined;

        if (hasText) {
          const indexField = this.resolveFullTextIndexField(
            typeName,
            text?.indexField,
          );

          if (!indexField) {
            throw {
              message: TypeInfoORMServiceError.INDEXING_MISSING_INDEX_FIELD,
              typeName,
            };
          }

          const fullTextBackend = indexing?.fullText?.backend;
          const searchResult =
            text?.mode === "exact"
              ? await searchExact({
                  backend: fullTextBackend,
                  query: text.query,
                  indexField,
                  limit: itemsPerPage,
                  cursor,
                  limits: indexing?.limits,
                })
              : await searchLossy({
                  backend: fullTextBackend,
                  query: text?.query ?? "",
                  indexField,
                  limit: itemsPerPage,
                  cursor,
                  limits: indexing?.limits,
                });

          docIds = searchResult.docIds;
          nextCursor = searchResult.nextCursor;
        } else {
          const where = criteriaToStructuredWhere(criteria);

          if (!where) {
            throw {
              message: TypeInfoORMServiceError.INDEXING_UNSUPPORTED_CRITERIA,
              typeName,
            };
          }

          const mappedWhere = this.applyStructuredFieldMap(
            where,
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
              } = this.getItemDACValidation(item, typeName, TypeOperation.READ);
              const listDenied = readDenied || !readAllowed;

              if (listDenied) {
                continue;
              }

              fieldsResourcesCache.push(fieldsResources);
            }

            items.push(item);
          } catch (error: any) {
            if (error?.message === DATA_ITEM_DB_DRIVER_ERRORS.ITEM_NOT_FOUND) {
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
      }

      const driver = this.getDriverInternal(typeName);
      const fieldsResourcesCache: Record<string, DACAccessResult>[] = [];
      const results = await executeDriverListItems(
        driver,
        config,
        useDAC
          ? (item: Partial<TypeInfoDataItem>): boolean => {
              const {
                allowed: readAllowed,
                denied: readDenied,
                fieldsResources = {},
              } = this.getItemDACValidation(item, typeName, TypeOperation.READ);
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
