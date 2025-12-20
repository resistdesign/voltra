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
  CheckRelationshipsResults,
  DeleteRelationshipResults,
  DiagnoseRelationshipsResults,
  OperationGroup,
  RelationshipOperation,
  TypeInfoORMAPI,
  TypeInfoORMServiceError,
} from "../../common/TypeInfoORM";
import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  DataItemDBDriver,
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
  ItemRelationshipOriginItemInfo,
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

export const cleanRelationshipItem = (
  relationshipItem: BaseItemRelationshipInfo,
): BaseItemRelationshipInfo => {
  const relItemKeys = Object.values(ItemRelationshipInfoKeys);
  const cleanedItem: Partial<BaseItemRelationshipInfo> = {};

  for (const rIK of relItemKeys) {
    cleanedItem[rIK] = relationshipItem[rIK];
  }

  return cleanedItem as BaseItemRelationshipInfo;
};

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
  extendedData: Record<any, any>,
  driver: DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>,
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
  itemResourcePathPrefix: LiteralValue[];
  relationshipResourcePathPrefix: LiteralValue[];
  accessingRole: DACRole;
  getDACRoleById: (id: string) => DACRole;
};

/**
 * The basis for the configuration for the TypeInfoORMService.
 * */
export type BaseTypeInfoORMServiceConfig = {
  typeInfoMap: TypeInfoMap;
  getDriver: (typeName: string) => DataItemDBDriver<any, any>;
  getRelationshipDriver: (
    typeName: string,
    fieldName: string,
  ) => ItemRelationshipDBDriver;
  enableRelationshipDiagnostics?: boolean;
  createRelationshipCleanupItem?: (
    relationshipOriginatingItem: ItemRelationshipOriginatingItemInfo,
  ) => Promise<void>;
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
 * A service using TypeInfo to perform ORM operations with one or many `DBServiceItemDriver` instances.
 * */
export class TypeInfoORMService implements TypeInfoORMAPI {
  protected dacRoleCache: Record<string, DACRole> = {};

  constructor(protected config: TypeInfoORMServiceConfig) {
    if (!config.typeInfoMap || Object.keys(config.typeInfoMap).length === 0) {
      console.error("TypeInfoORMService initialized without a typeInfoMap.");

      throw new Error(TypeInfoORMServiceError.MISSING_TYPE_INFO_MAP);
    }

    if (!config.getDriver) {
      throw new Error(TypeInfoORMServiceError.NO_DRIVERS_SUPPLIED);
    }

    if (!config.getRelationshipDriver) {
      throw new Error(TypeInfoORMServiceError.NO_RELATIONSHIP_DRIVERS_SUPPLIED);
    }
  }

  protected getItemDACValidation = (
    item: Partial<TypeInfoDataItem>,
    typeName: string,
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
    itemRelationship: BaseItemRelationshipInfo,
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
    driver: DataItemDBDriver<ItemType, UniquelyIdentifyingFieldName>,
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
    typeName: string,
  ): DataItemDBDriver<any, any> => {
    const driver = this.config.getDriver(typeName);

    if (!driver) {
      throw new Error(TypeInfoORMServiceError.INVALID_DRIVER);
    }

    return this.getWrappedDriverWithExtendedErrorData(driver, { typeName });
  };

  protected getRelationshipDriverInternal = (
    typeName: string,
    fieldName: string,
  ): ItemRelationshipDBDriver => {
    const driver = this.config.getRelationshipDriver(typeName, fieldName);

    if (!driver) {
      throw new Error(TypeInfoORMServiceError.INVALID_RELATIONSHIP_DRIVER);
    }

    return this.getWrappedDriverWithExtendedErrorData(driver, {
      typeName,
      fieldName,
    });
  };

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

  protected validateReadOperation = (
    typeName: string,
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

  protected validate = (
    typeName: string,
    item: TypeInfoDataItem,
    typeOperation: TypeOperation,
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

  protected getCleanItem = (
    typeName: string,
    item: Partial<TypeInfoDataItem>,
    dacFieldResources?: Partial<
      Record<keyof TypeInfoDataItem, DACAccessResult>
    >,
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

  protected getCleanSelectedFields = (
    typeName: string,
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

  protected validateRelationshipItem = (
    relationshipItem: ItemRelationshipInfoType,
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
      const relationshipInfoForLookup: BaseItemRelationshipInfo = {
        fromTypeName,
        fromTypeFieldName,
        fromTypePrimaryFieldValue:
          ItemRelationshipInfoKeys.fromTypePrimaryFieldValue in relationshipItem
            ? relationshipItem.fromTypePrimaryFieldValue
            : "",
        toTypePrimaryFieldValue:
          ItemRelationshipInfoKeys.toTypePrimaryFieldValue in relationshipItem
            ? relationshipItem.toTypePrimaryFieldValue
            : "",
      };
      const { field: fromTypeField } = this.getFromTypeInfoAndField(
        fromTypeName,
        fromTypeFieldName,
        relationshipInfoForLookup,
      );
      const { typeReference = undefined } = fromTypeField;
      const relatedTypeInfo = typeReference
        ? (() => {
            try {
              return this.getTypeInfo(typeReference);
            } catch (error) {
              throw {
                ...(error as Record<any, any>),
                fromTypeName,
                fromTypeFieldName,
                typeReference,
                relationshipItem,
              };
            }
          })()
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

  protected getFromTypeInfoAndField = (
    fromTypeName: string,
    fromTypeFieldName: string,
    relationshipItem?: BaseItemRelationshipInfo,
  ): { typeInfo: TypeInfo; field: TypeInfoField } => {
    const { typeInfoMap } = this.config;
    if (!typeInfoMap) {
      throw {
        message: TypeInfoORMServiceError.INVALID_TYPE_INFO,
        typeName: fromTypeName,
        fromTypeFieldName,
        relationshipItem,
      };
    }

    const typeInfo = typeInfoMap[fromTypeName];

    if (!typeInfo) {
      throw {
        message: TypeInfoORMServiceError.INVALID_TYPE_INFO,
        typeName: fromTypeName,
        fromTypeFieldName,
        relationshipItem,
      };
    }

    const { fields = {} } = typeInfo;
    const fromTypeField = fields[
      fromTypeFieldName as keyof typeof fields
    ] as TypeInfoField | undefined;

    if (!fromTypeField) {
      throw {
        message: TypeInfoORMServiceError.INVALID_RELATIONSHIP,
        typeName: fromTypeName,
        fromTypeFieldName,
        relationshipItem,
      };
    }

    return { typeInfo, field: fromTypeField };
  };

  protected cleanupRelationships = async (
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
   * */
  createRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<boolean> => {
    this.validateRelationshipItem(relationshipItem);

    const cleanedItem = cleanRelationshipItem(relationshipItem);
    const { fromTypeName, fromTypeFieldName } = cleanedItem;
    const { field: fromTypeField } = this.getFromTypeInfoAndField(
      fromTypeName,
      fromTypeFieldName,
      cleanedItem,
    );
    const relationshipIsMultiple = !!fromTypeField.array;

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
      const driver = this.getRelationshipDriverInternal(
        fromTypeName,
        fromTypeFieldName,
      );

      if (relationshipIsMultiple) {
        await driver.createItem(cleanedItem);
      } else {
        // VALIDATION: Need to update when the field is not an array.
        const listItemsResultRaw = await driver.listItems(
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
                {
                  fieldName: ItemRelationshipInfoKeys.fromTypePrimaryFieldValue,
                  operator: ComparisonOperators.EQUALS,
                  value: cleanedItem.fromTypePrimaryFieldValue,
                },
              ],
            },
            itemsPerPage: 1,
          },
          [ItemRelationshipInfoIdentifyingKeys.id],
        );

        const responseIsInvalid =
          !listItemsResultRaw ||
          typeof listItemsResultRaw !== "object" ||
          !Array.isArray(
            (listItemsResultRaw as Partial<ListItemsResults<ItemRelationshipInfo>>)
              .items,
          );

        if (responseIsInvalid) {
          const error = {
            message: TypeInfoORMServiceError.INVALID_RELATIONSHIP_DRIVER,
            typeName: fromTypeName,
            fromTypeFieldName,
            relationshipItem,
            driverResponse: listItemsResultRaw,
          };

          console.error(
            "Invalid relationship driver response when listing items.",
            error,
          );

          throw error;
        }

        const listItemsResult =
          listItemsResultRaw as ListItemsResults<ItemRelationshipInfo>;
        const listResult: ListItemsResults<ItemRelationshipInfo> =
          listItemsResult || { items: [] };
        const [{ id: existingIdentifier } = {} as ItemRelationshipInfo] =
          listResult.items || [];

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
   * */
  listRelationships = async (
    config: ListRelationshipsConfig,
  ): Promise<ListItemsResults<ItemRelationshipInfo>> => {
    const { useDAC } = this.config;
    const { relationshipItemOrigin, ...remainingConfig } = config;
    this.validateRelationshipItem(relationshipItemOrigin, [
      ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
    ]);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const driver = this.getRelationshipDriverInternal(
      fromTypeName,
      fromTypeFieldName,
    );
    const results = await driver.listItems({
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
   * Check which relationships exist for a list of candidate items.
   * */
  checkRelationships = async (
    relationshipItemOrigin: ItemRelationshipOriginItemInfo,
    candidateToPrimaryFieldValues: string[],
  ): Promise<CheckRelationshipsResults> => {
    const { useDAC } = this.config;
    const normalizeValue = (value: any): string =>
      typeof value === "string" ? value.trim() : `${value}`.trim();
    const originValidation = validateRelationshipItem(relationshipItemOrigin, [
      ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
    ]);

    if (!originValidation.valid) {
      console.error("Invalid relationship origin for checkRelationships.", {
        relationshipItemOrigin,
        originValidation,
      });

      throw originValidation;
    }

    this.validateRelationshipItem(relationshipItemOrigin, [
      ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
    ]);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const normalizedFromTypeName = normalizeValue(fromTypeName);
    const normalizedFromTypeFieldName = normalizeValue(fromTypeFieldName);
    const normalizedFromTypePrimaryFieldValue = normalizeValue(
      fromTypePrimaryFieldValue,
    );
    const originNormalizationChanged =
      normalizedFromTypeName !== fromTypeName ||
      normalizedFromTypeFieldName !== fromTypeFieldName ||
      normalizedFromTypePrimaryFieldValue !== fromTypePrimaryFieldValue;
    const rawCandidates = candidateToPrimaryFieldValues ?? [];
    const driver = this.getRelationshipDriverInternal(
      normalizedFromTypeName,
      normalizedFromTypeFieldName,
    );
    const normalizedCandidates = rawCandidates
      .filter((value) => typeof value !== "undefined" && value !== null)
      .map((value) => normalizeValue(value))
      .filter((value) => value.length > 0);
    const uniqueCandidates = Array.from(
      new Set(normalizedCandidates),
    );

    console.info("checkRelationships input validation passed.", {
      fromTypeName: normalizedFromTypeName,
      fromTypeFieldName: normalizedFromTypeFieldName,
      fromTypePrimaryFieldValue: normalizedFromTypePrimaryFieldValue,
      originNormalizationChanged,
      rawCandidateCount: rawCandidates.length,
      normalizedCandidateCount: normalizedCandidates.length,
      uniqueCandidateCount: uniqueCandidates.length,
    });

    if (uniqueCandidates.length === 0) {
      return {
        existingToTypePrimaryFieldValues: [],
      };
    }

    const baseCriteria = [
      {
        fieldName: ItemRelationshipInfoKeys.fromTypeName,
        operator: ComparisonOperators.EQUALS,
        value: normalizedFromTypeName,
      },
      {
        fieldName: ItemRelationshipInfoKeys.fromTypeFieldName,
        operator: ComparisonOperators.EQUALS,
        value: normalizedFromTypeFieldName,
      },
      {
        fieldName: ItemRelationshipInfoKeys.fromTypePrimaryFieldValue,
        operator: ComparisonOperators.EQUALS,
        value: normalizedFromTypePrimaryFieldValue,
      },
    ];
    const buildCriteria = (
      fieldCriteria: SearchCriteria["fieldCriteria"],
    ): SearchCriteria => ({
      logicalOperator: LogicalOperators.AND,
      fieldCriteria,
    });

    const collectAllowedValues = (
      items: Partial<ItemRelationshipInfo>[],
    ): string[] => {
      const values: string[] = [];

      for (const item of items) {
        const toTypePrimaryFieldValue =
          item[ItemRelationshipInfoKeys.toTypePrimaryFieldValue];

        if (!toTypePrimaryFieldValue) {
          continue;
        }

        if (useDAC) {
          const { allowed: readAllowed, denied: readDenied } =
            this.getRelationshipDACValidation(
              item as ItemRelationshipInfo,
              RelationshipOperation.GET,
            );
          const listDenied = readDenied || !readAllowed;

          if (listDenied) {
            continue;
          }
        }

        values.push(`${toTypePrimaryFieldValue}`);
      }

      return values;
    };

    try {
      if (this.config.enableRelationshipDiagnostics) {
        const diagnosticItems: ItemRelationshipInfo[] = [];
        let cursor: string | undefined = undefined;

        do {
          const { items = [], cursor: nextCursor } = await driver.listItems({
            itemsPerPage: 250,
            criteria: {
              logicalOperator: LogicalOperators.AND,
              fieldCriteria: baseCriteria,
            },
          });

          diagnosticItems.push(...(items as ItemRelationshipInfo[]));
          cursor = nextCursor;
        } while (cursor);

        const storedValues = diagnosticItems
          .map((item) => item.toTypePrimaryFieldValue)
          .filter((value) => typeof value !== "undefined" && value !== null)
          .map((value) => normalizeValue(value));
        const uniqueStoredValues = Array.from(new Set(storedValues));
        const storedValueSet = new Set(uniqueStoredValues);
        const candidateValueSet = new Set(uniqueCandidates);
        const missingFromStorage = uniqueCandidates.filter(
          (candidate) => !storedValueSet.has(candidate),
        );
        const extraStoredToTypePrimaryFieldValues = uniqueStoredValues.filter(
          (value) => !candidateValueSet.has(value),
        );

        console.info("checkRelationships diagnostics.", {
          fromTypeName: normalizedFromTypeName,
          fromTypeFieldName: normalizedFromTypeFieldName,
          fromTypePrimaryFieldValue: normalizedFromTypePrimaryFieldValue,
          originNormalizationChanged,
          storedCount: diagnosticItems.length,
          storedValues: uniqueStoredValues,
          candidateValues: uniqueCandidates,
          missingFromStorage,
          extraStoredToTypePrimaryFieldValues,
          rawRelationshipItems: diagnosticItems,
        });
      }

      console.info("checkRelationships querying relationship driver.", {
        fromTypeName: normalizedFromTypeName,
        fromTypeFieldName: normalizedFromTypeFieldName,
        fromTypePrimaryFieldValue: normalizedFromTypePrimaryFieldValue,
        candidateToTypePrimaryFieldValues: uniqueCandidates,
      });
      const criteria = buildCriteria([
        ...baseCriteria,
        {
          fieldName: ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
          operator: ComparisonOperators.IN,
          value: uniqueCandidates,
          valueOptions: uniqueCandidates,
        },
      ]);
      console.info("checkRelationships query criteria.", {
        criteria,
      });
      const results = await driver.listItems(
        {
          itemsPerPage: uniqueCandidates.length,
          criteria,
        },
        useDAC ? undefined : [ItemRelationshipInfoKeys.toTypePrimaryFieldValue],
      );
      const existingValues = new Set(
        collectAllowedValues(
          (results as ListItemsResults<Partial<ItemRelationshipInfo>>).items ??
            [],
        ),
      );

      return {
        existingToTypePrimaryFieldValues: uniqueCandidates.filter((candidate) =>
          existingValues.has(candidate),
        ),
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        error.message ===
          DATA_ITEM_DB_DRIVER_ERRORS.SEARCH_COMPARISON_OPERATOR_NOT_SUPPORTED
      ) {
        const existingCandidates = new Set<string>();

        for (const candidate of uniqueCandidates) {
          const criteria = buildCriteria([
            ...baseCriteria,
            {
              fieldName: ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
              operator: ComparisonOperators.EQUALS,
              value: candidate,
            },
          ]);

          console.info("checkRelationships querying relationship driver.", {
            fromTypeName: normalizedFromTypeName,
            fromTypeFieldName: normalizedFromTypeFieldName,
            fromTypePrimaryFieldValue: normalizedFromTypePrimaryFieldValue,
            candidateToTypePrimaryFieldValue: candidate,
            criteria,
          });
          const results = await driver.listItems(
            {
              itemsPerPage: 1,
              criteria,
            },
            useDAC
              ? undefined
              : [ItemRelationshipInfoKeys.toTypePrimaryFieldValue],
          );
          const allowedValues = collectAllowedValues(
            (results as ListItemsResults<Partial<ItemRelationshipInfo>>).items ??
              [],
          );

          if (allowedValues.includes(candidate)) {
            existingCandidates.add(candidate);
          }
        }

        return {
          existingToTypePrimaryFieldValues: uniqueCandidates.filter((candidate) =>
            existingCandidates.has(candidate),
          ),
        };
      }

      throw error;
    }
  };

  diagnoseRelationships = async (
    relationshipItemOrigin: ItemRelationshipOriginItemInfo,
    candidateToPrimaryFieldValues: string[] = [],
  ): Promise<DiagnoseRelationshipsResults> => {
    this.validateRelationshipItem(relationshipItemOrigin, [
      ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
    ]);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const normalizedCandidates = candidateToPrimaryFieldValues
      .filter((value) => typeof value !== "undefined" && value !== null)
      .map((value) => `${value}`.trim())
      .filter((value) => value.length > 0);
    const uniqueCandidates = Array.from(new Set(normalizedCandidates));
    const relationshipItems: ItemRelationshipInfo[] = [];
    let cursor: string | undefined = undefined;

    do {
      const { items = [], cursor: nextCursor } = await this.listRelationships({
        relationshipItemOrigin,
        itemsPerPage: 250,
        cursor,
      });

      relationshipItems.push(...items);
      cursor = nextCursor;
    } while (cursor);

    const relationshipToTypePrimaryFieldValues = relationshipItems
      .map((item) => item.toTypePrimaryFieldValue)
      .filter((value): value is string => typeof value !== "undefined")
      .map((value) => `${value}`);
    const storedValuesSet = new Set(relationshipToTypePrimaryFieldValues);
    const candidateValuesSet = new Set(uniqueCandidates);
    const missingFromStorage = uniqueCandidates.filter(
      (candidate) => !storedValuesSet.has(candidate),
    );
    const extraStoredToTypePrimaryFieldValues = relationshipToTypePrimaryFieldValues.filter(
      (value) => !candidateValuesSet.has(value),
    );

    console.info("diagnoseRelationships completed.", {
      fromTypeName,
      fromTypeFieldName,
      fromTypePrimaryFieldValue,
      storedCount: relationshipItems.length,
      candidateCount: uniqueCandidates.length,
      missingFromStorageCount: missingFromStorage.length,
      extraStoredCount: extraStoredToTypePrimaryFieldValues.length,
    });

    return {
      relationshipItems,
      relationshipToTypePrimaryFieldValues,
      normalizedCandidateToTypePrimaryFieldValues: uniqueCandidates,
      missingFromStorage,
      extraStoredToTypePrimaryFieldValues,
    };
  };

  listRelatedItems = async (
    config: ListRelationshipsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ) => {
    const {
      relationshipItemOrigin: { fromTypeName, fromTypeFieldName },
    } = config;
    this.validateRelationshipItem(config.relationshipItemOrigin, [
      ItemRelationshipInfoKeys.toTypePrimaryFieldValue,
    ]);
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

      return newIdentifier;
    }
  };

  /**
   * Read an existing item of the given type.
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

        return result;
      }
    }
  };

  /**
   * Delete an existing item of the given type.
   * */
  delete = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<boolean> => {
    const { useDAC } = this.config;
    const { primaryField } = this.getTypeInfo(typeName);
    const itemWithPrimaryFieldOnly: TypeInfoDataItem = {
      [primaryField as keyof TypeInfoDataItem]: primaryFieldValue,
    };
    this.validate(typeName, itemWithPrimaryFieldOnly, TypeOperation.DELETE);
    const driver = this.getDriverInternal(typeName);
    const existingItem =
      // SECURITY: Dac validation could fail when `item` is missing unselected fields.
      useDAC
        ? await driver.readItem(primaryFieldValue)
        : itemWithPrimaryFieldOnly;
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

      return result;
    }
  };

  /**
   * List items of the given type, with the given criteria.
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

    const { typeInfoMap, useDAC } = this.config;
    const typeInfo = this.getTypeInfo(typeName);
    const { fields: {} = {} } = typeInfo;
    const { criteria } = config;
    const { fieldCriteria = [] }: Partial<SearchCriteria> = criteria || {};
    const searchFieldValidationResults = validateSearchFields(
      typeName,
      typeInfoMap,
      fieldCriteria,
      true,
    );
    const { valid: searchFieldsValid } = searchFieldValidationResults;

    if (searchFieldsValid) {
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
