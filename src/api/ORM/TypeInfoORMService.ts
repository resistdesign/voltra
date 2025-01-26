import {
  LiteralValue,
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  RelationshipValidationType,
  TypeInfoValidationResults,
  validateTypeInfoValue,
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
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
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
  DACConstraint,
  DACDataItemResourceAccessResultMap,
  DACRole,
  getDACRoleHasAccessToDataItem,
  getResourceAccessByDACRole,
  mergeDACAccessResults,
  mergeDACDataItemResourceAccessResultMaps,
} from "../DataAccessControl";

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

// TODO: Integrate DAC. 📛

/**
 * A service using TypeInfo to perform ORM operations with one or many `DBServiceItemDriver` instances.
 * */
export class TypeInfoORMService implements TypeInfoORMAPI {
  protected cachedFlattenedConstraints: DACConstraint[] = [];

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

  // TODO: Incorporate getItemDACValidation.
  //   - [x] create
  //   - [x] read
  //   - [] update
  //   - [] delete
  //   - [] list
  protected getItemDACValidation = (
    item: TypeInfoDataItem,
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
          item,
          typeName,
          typeInfo,
          accessingRole,
          getDACRoleById,
          [typeOperation, ...itemResourcePathPrefix],
          this.cachedFlattenedConstraints,
        ),
        getDACRoleHasAccessToDataItem(
          item,
          typeName,
          typeInfo,
          accessingRole,
          getDACRoleById,
          [OperationGroup.ALL_ITEM_OPERATIONS, ...itemResourcePathPrefix],
          this.cachedFlattenedConstraints,
        ),
        getDACRoleHasAccessToDataItem(
          item,
          typeName,
          typeInfo,
          accessingRole,
          getDACRoleById,
          [OperationGroup.ALL_OPERATIONS, ...itemResourcePathPrefix],
          this.cachedFlattenedConstraints,
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

  // TODO: Incorporate getRelationshipDACValidation.
  //   - [] createRelationship
  //   - [] deleteRelationship
  //   - [] listRelationships
  protected getRelationshipDACValidation = (
    itemRelationship: BaseItemRelationshipInfo,
    relationshipOperation: RelationshipOperation,
  ): DACAccessResult => {
    const { useDAC } = this.config;

    if (useDAC) {
      const { dacConfig } = this.config;
      const { relationshipResourcePathPrefix, accessingRole, getDACRoleById } =
        dacConfig;
      const {
        fromTypeName,
        fromTypeFieldName,
        fromTypePrimaryFieldValue,
        toTypePrimaryFieldValue,
      } = itemRelationship;
      const itemRelationshipPath: LiteralValue[] = [
        fromTypeName,
        fromTypeFieldName,
        fromTypePrimaryFieldValue,
        toTypePrimaryFieldValue,
      ];

      return mergeDACAccessResults(
        getResourceAccessByDACRole(
          [
            relationshipOperation,
            ...relationshipResourcePathPrefix,
            ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
            ...itemRelationshipPath,
          ],
          accessingRole,
          getDACRoleById,
          this.cachedFlattenedConstraints,
        ),
        getResourceAccessByDACRole(
          [
            OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
            ...relationshipResourcePathPrefix,
            ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
            ...itemRelationshipPath,
          ],
          accessingRole,
          getDACRoleById,
          this.cachedFlattenedConstraints,
        ),
        getResourceAccessByDACRole(
          [
            OperationGroup.ALL_OPERATIONS,
            ...relationshipResourcePathPrefix,
            ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
            ...itemRelationshipPath,
          ],
          accessingRole,
          getDACRoleById,
          this.cachedFlattenedConstraints,
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
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_TYPE_INFO);
    }

    return typeInfo;
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
    item: TypeInfoDataItem,
    dacFieldResources: Partial<Record<keyof TypeInfoDataItem, DACAccessResult>>,
  ): TypeInfoDataItem => {
    const typeInfo = this.getTypeInfo(typeName);
    const itemCleanedByTypeInfo = removeTypeReferenceFieldsFromDataItem(
      typeInfo,
      removeNonexistentFieldsFromDataItem(typeInfo, item),
    );
    const cleanItem: TypeInfoDataItem = {};

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
  ): Promise<string> => {
    this.validateRelationshipItem(relationshipItem);

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

    let identifier: string;

    if (relationshipIsMultiple) {
      identifier = await driver.createItem(cleanedItem);
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
        identifier = existingIdentifier;

        await driver.updateItem(existingIdentifier, cleanedItem);
      } else {
        identifier = await driver.createItem(cleanedItem);
      }
    }

    return identifier;
  };

  /**
   * Delete a relationship between two items.
   * */
  deletedRelationship = async (
    relationshipItem: BaseItemRelationshipInfo,
  ): Promise<DeleteRelationshipResults> => {
    this.validateRelationshipItem(relationshipItem);

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
  };

  /**
   * List the relationships for a given item.
   * */
  listRelationships = async (
    config: ListRelationshipsConfig,
  ): Promise<boolean | ListItemsResults<ItemRelationshipInfo>> => {
    const { relationshipItemOrigin, ...remainingConfig } = config;
    this.validateRelationshipItem(relationshipItemOrigin);

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

    return results as ListItemsResults<ItemRelationshipInfo>;
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
  ): Promise<TypeInfoDataItem> => {
    const driver = this.getDriverInternal(typeName);
    const cleanSelectedFields = this.getCleanSelectedFields(
      typeName,
      selectedFields,
    );
    // SECURITY: Dac validation could fail when item is missing unselected fields.
    // CANNOT pass selected fields to driver.
    // TODO: This is not ideal.
    const item = await driver.readItem(primaryFieldValue);
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
      const cleanItem = removeUnselectedFieldsFromDataItem(
        this.getTypeInfo(typeName),
        this.getCleanItem(typeName, item, fieldsResources),
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
      const cleanItem = this.getCleanItem(typeName, item);
      const result = await driver.updateItem(primaryFieldValue, cleanItem);

      return result;
    }
  };

  /**
   * Delete an existing item of the given type.
   * */
  delete = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<boolean> => {
    const driver = this.getDriverInternal(typeName);
    const result = await driver.deleteItem(primaryFieldValue);

    await this.cleanupRelationships({
      fromTypeName: typeName,
      fromTypePrimaryFieldValue: primaryFieldValue,
    });

    return result;
  };

  /**
   * List items of the given type, with the given criteria.
   * */
  list = async (
    typeName: string,
    config: ListItemsConfig,
    selectedFields?: (keyof TypeInfoDataItem)[],
  ): Promise<boolean | ListItemsResults<TypeInfoDataItem>> => {
    const { fields: {} = {} } = this.getTypeInfo(typeName);
    const { criteria } = config;
    const { fieldCriteria = [] }: Partial<SearchCriteria> = criteria || {};
    const searchFieldValidationResults = validateSearchFields(
      typeName,
      this.config.typeInfoMap,
      fieldCriteria,
      true,
    );
    const { valid: searchFieldsValid } = searchFieldValidationResults;

    if (searchFieldsValid) {
      const driver = this.getDriverInternal(typeName);
      const cleanSelectedFields = this.getCleanSelectedFields(
        typeName,
        selectedFields,
      );
      const results = await driver.listItems(config, cleanSelectedFields);

      return results;
    } else {
      throw searchFieldValidationResults;
    }
  };
}
