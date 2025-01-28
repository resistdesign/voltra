import {
  LiteralValue,
  TypeInfo,
  TypeInfoDataItem,
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
import {
  BaseItemRelationshipInfo,
  ItemRelationshipInfo,
  ItemRelationshipInfoKeys,
  ItemRelationshipInfoType,
  ItemRelationshipOriginatingItemInfo,
} from "../../common";
import { validateRelationshipItem } from "../../common/ItemRelationships";
import {
  DeleteRelationshipResults,
  OperationGroup,
  RelationshipOperation,
  TYPE_INFO_ORM_SERVICE_ERRORS,
  TypeInfoORMAPI,
} from "../../common/TypeInfoORM";
import { DataItemDBDriver, ItemRelationshipDBDriver } from "./drivers";
import {
  removeNonexistentFieldsFromDataItem,
  removeNonexistentFieldsFromSelectedFields,
  removeTypeReferenceFieldsFromDataItem,
  removeTypeReferenceFieldsFromSelectedFields,
  removeUnselectedFieldsFromDataItem,
} from "../../common/TypeParsing/Utils";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfo";
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
 * The configuration for the TypeInfoORMService.
 * */
export type TypeInfoORMServiceConfig = {
  typeInfoMap: TypeInfoMap;
  getDriver: (typeName: string) => DataItemDBDriver<any, any>;
  getRelationshipDriver: (
    typeName: string,
    fieldName: string,
  ) => ItemRelationshipDBDriver;
  createRelationshipCleanupItem?: (
    relationshipOriginatingItem: ItemRelationshipOriginatingItemInfo,
  ) => Promise<void>;
  customValidators?: CustomTypeInfoFieldValidatorMap;
} & (
  | {
      useDAC: true;
      dacConfig: TypeInfoORMDACConfig;
    }
  | {
      useDAC: false;
    }
);

/**
 * A service using TypeInfo to perform ORM operations with one or many `DBServiceItemDriver` instances.
 * */
export class TypeInfoORMService implements TypeInfoORMAPI {
  protected dacRoleCache: Record<string, DACRole> = {};

  constructor(protected config: TypeInfoORMServiceConfig) {
    if (!config.getDriver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.NO_DRIVERS_SUPPLIED);
    }

    if (!config.getRelationshipDriver) {
      throw new Error(
        TYPE_INFO_ORM_SERVICE_ERRORS.NO_RELATIONSHIP_DRIVERS_SUPPLIED,
      );
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
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_DRIVER);
    }

    return this.getWrappedDriverWithExtendedErrorData(driver, { typeName });
  };

  protected getRelationshipDriverInternal = (
    typeName: string,
    fieldName: string,
  ): ItemRelationshipDBDriver => {
    const driver = this.config.getRelationshipDriver(typeName, fieldName);

    if (!driver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_RELATIONSHIP_DRIVER);
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
        message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_TYPE_INFO,
        typeName,
      };
    } else {
      const { primaryField } = typeInfo;

      if (typeof primaryField === "undefined") {
        throw {
          message: TYPE_INFO_ORM_SERVICE_ERRORS.TYPE_INFO_MISSING_PRIMARY_FIELD,
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
      valid: !!typeInfo,
      error: !!typeInfo ? "" : ERROR_MESSAGE_CONSTANTS.TYPE_DOES_NOT_EXIST,
      errorMap: {},
    };
    const {
      valid: operationValid,
      error: operationError,
      errorMap: operationErrorMap,
    } = validateTypeOperationAllowed(
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
    dacFieldResources: Partial<Record<keyof TypeInfoDataItem, DACAccessResult>>,
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
    const cleanItem: Partial<TypeInfoDataItem> = {};

    for (const fN in itemCleanedByTypeInfo) {
      const fR = dacFieldResources[fN];

      if (fR) {
        const { allowed, denied } = fR;

        if (allowed && !denied) {
          cleanItem[fN] = itemCleanedByTypeInfo[fN];
        }
      } else {
        cleanItem[fN] = itemCleanedByTypeInfo[fN];
      }
    }

    return cleanItem;
  };

  protected getCleanSelectedFields = (
    typeName: string,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ): (keyof TypeInfoDataItem)[] | undefined => {
    const typeInfo = this.getTypeInfo(typeName);
    const cleanSelectedFields =
      removeTypeReferenceFieldsFromSelectedFields<TypeInfoDataItem>(
        typeInfo,
        removeNonexistentFieldsFromSelectedFields<TypeInfoDataItem>(
          typeInfo,
          selectedFields,
        ),
      );

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
          valid: false,
          error: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_RELATIONSHIP,
          errorMap: {},
        };

        throw relationshipValidationResults;
      }
    }
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

    const { allowed: createAllowed, denied: createDenied } =
      this.getRelationshipDACValidation(
        relationshipItem,
        RelationshipOperation.SET,
      );

    if (createDenied || !createAllowed) {
      throw {
        message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_OPERATION,
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
   * */
  deletedRelationship = async (
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
        message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_OPERATION,
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
        checkExistence: false,
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
  ): Promise<boolean | ListItemsResults<ItemRelationshipInfo>> => {
    const { useDAC } = this.config;
    const { relationshipItemOrigin, ...remainingConfig } = config;
    this.validateRelationshipItem(relationshipItemOrigin);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const driver = this.getRelationshipDriverInternal(
      fromTypeName,
      fromTypeFieldName,
    );
    const { checkExistence = false } = remainingConfig;
    const results = await driver.listItems({
      ...remainingConfig,
      checkExistence: useDAC ? false : checkExistence,
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

      return checkExistence
        ? revisedItems.length > 0
        : {
            items: revisedItems,
            cursor: nextCursor,
          };
    } else {
      return results as boolean | ListItemsResults<ItemRelationshipInfo>;
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
        message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_OPERATION,
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
      // SECURITY: Dac validation could fail when item is missing unselected fields.
      // CANNOT pass selected fields to driver when DAC is enabled.
      useDAC ? undefined : cleanSelectedFields,
    );
    const {
      allowed: readAllowed,
      denied: readDenied,
      fieldsResources = {},
    } = this.getItemDACValidation(item, typeName, TypeOperation.READ);

    if (readDenied || !readAllowed) {
      throw {
        message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_OPERATION,
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
        valid: false,
        error: TYPE_INFO_ORM_SERVICE_ERRORS.NO_PRIMARY_FIELD_VALUE_SUPPLIED,
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
          message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_OPERATION,
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
      // SECURITY: Dac validation could fail when item is missing unselected fields.
      useDAC
        ? await driver.readItem(primaryFieldValue)
        : itemWithPrimaryFieldOnly;
    const { allowed: deleteAllowed, denied: deleteDenied } =
      this.getItemDACValidation(existingItem, typeName, TypeOperation.DELETE);

    if (deleteDenied || !deleteAllowed) {
      throw {
        message: TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_OPERATION,
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
  ): Promise<boolean | ListItemsResults<Partial<TypeInfoDataItem>>> => {
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );
    this.validateReadOperation(typeName, cleanSelectedFields);

    const { typeInfoMap, useDAC } = this.config;
    const { fields: {} = {} } = this.getTypeInfo(typeName);
    const { criteria, checkExistence } = config;
    const { fieldCriteria = [] }: Partial<SearchCriteria> = criteria || {};
    const searchFieldValidationResults = validateSearchFields(
      typeName,
      typeInfoMap,
      fieldCriteria,
      true,
    );
    const { valid: searchFieldsValid } = searchFieldValidationResults;

    if (searchFieldsValid) {
      // TODO: Satisfy `itemsPerPage` here instead of in the drivers.
      const driver = this.getDriverInternal(typeName);
      const results = await driver.listItems(
        {
          ...config,
          // SECURITY: We need to run the items through DAC before we expose their existence.
          checkExistence: useDAC ? false : checkExistence,
        },
        // SECURITY: Dac validation could fail when item is missing unselected fields.
        // CANNOT pass selected fields to driver when DAC is enabled.
        useDAC ? undefined : cleanSelectedFields,
      );

      if (useDAC) {
        const { items = [], cursor: nextCursor } = results as ListItemsResults<
          Partial<TypeInfoDataItem>
        >;
        const revisedItems: Partial<TypeInfoDataItem>[] = [];

        for (const rItm of items) {
          const {
            allowed: readAllowed,
            denied: readDenied,
            fieldsResources = {},
          } = this.getItemDACValidation(rItm, typeName, TypeOperation.READ);
          const listDenied = readDenied || !readAllowed;

          if (!listDenied) {
            revisedItems.push(
              this.getCleanItem(
                typeName,
                rItm,
                fieldsResources,
                cleanSelectedFields,
              ),
            );

            if (checkExistence) {
              break;
            }
          }
        }

        return checkExistence
          ? revisedItems.length > 0
          : {
              items: revisedItems,
              cursor: nextCursor,
            };
      } else {
        return results;
      }
    } else {
      throw searchFieldValidationResults;
    }
  };
}
