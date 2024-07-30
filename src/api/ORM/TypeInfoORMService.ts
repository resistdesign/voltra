import {
  BaseDBRelationshipItem,
  DBRelatedItemDriver,
  DBRelationshipItem,
  DBRelationshipItemKeys,
  DBRelationshipItemType,
  DBRelationshipOriginatingItem,
  DBServiceItemDriver,
  ListItemResults,
  ListItemsConfig,
  ListRelationshipsConfig,
} from "./ServiceTypes";
import {
  TypeInfo,
  TypeInfoMap,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  RelationshipValidationType,
  TypeInfoValidationResults,
  validateRelationshipItem,
  validateTypeInfoValue,
} from "../../common/TypeParsing/Validation";
import { TypeInfoDataItem } from "../../app/components";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../common/SearchTypes";

export const cleanRelationshipItem = (
  relationshipItem: BaseDBRelationshipItem,
): BaseDBRelationshipItem => {
  const relItemKeys = Object.values(DBRelationshipItemKeys);
  const cleanedItem: Partial<BaseDBRelationshipItem> = {};

  for (const rIK of relItemKeys) {
    cleanedItem[rIK] = relationshipItem[rIK];
  }

  return cleanedItem as BaseDBRelationshipItem;
};

export const TYPE_INFO_ORM_SERVICE_ERRORS = {
  NO_DRIVERS_SUPPLIED: "NO_DRIVERS_SUPPLIED",
  NO_RELATIONSHIP_DRIVERS_SUPPLIED: "NO_RELATIONSHIP_DRIVERS_SUPPLIED",
  NO_PRIMARY_FIELD_VALUE_SUPPLIED: "NO_PRIMARY_FIELD_VALUE_SUPPLIED",
  INVALID_DRIVER: "INVALID_DRIVER",
  INVALID_RELATIONSHIP_DRIVER: "INVALID_RELATIONSHIP_DRIVER",
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  INVALID_RELATIONSHIP: "INVALID_RELATIONSHIP",
};

export type TypeInfoORMServiceConfig = {
  typeInfoMap: TypeInfoMap;
  getDriver: (typeName: string) => DBServiceItemDriver<any, any>;
  getRelationshipDriver: (
    typeName: string,
    fieldName: string,
  ) => DBRelatedItemDriver;
  createRelationshipCleanupItem?: (
    relationshipOriginatingItem: DBRelationshipOriginatingItem,
  ) => Promise<void>;
  customValidators?: CustomTypeInfoFieldValidatorMap;
};

export class TypeInfoORMService {
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

  protected getDriverInternal = (
    typeName: string,
  ): DBServiceItemDriver<any, any> => {
    const driver = this.config.getDriver(typeName);

    if (!driver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_DRIVER);
    }

    return driver;
  };

  protected getRelationshipDriverInternal = (
    typeName: string,
    fieldName: string,
  ): DBRelatedItemDriver => {
    const driver = this.config.getRelationshipDriver(typeName, fieldName);

    if (!driver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_RELATIONSHIP_DRIVER);
    }

    return driver;
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

  protected validateRelationshipItem = (
    relationshipItem: DBRelationshipItemType,
    omitFields: DBRelationshipItemKeys[] = [],
  ) => {
    const validationResults = validateRelationshipItem(
      relationshipItem as BaseDBRelationshipItem,
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

  /**
   * Create a new relationship between two items.
   * */
  createRelationship = async (
    relationshipItem: BaseDBRelationshipItem,
  ): Promise<string> => {
    this.validateRelationshipItem(relationshipItem);

    const cleanedItem = cleanRelationshipItem(relationshipItem);
    const { fromTypeName, fromTypeFieldName } = cleanedItem;
    const driver = this.getRelationshipDriverInternal(
      fromTypeName,
      fromTypeFieldName,
    );
    const newIdentifier = await driver.createItem(cleanedItem);

    return newIdentifier;
  };

  /**
   * Delete a relationship between two items.
   * */
  deletedRelationship = async (
    relationshipItem: BaseDBRelationshipItem,
  ): Promise<boolean> => {
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
    const { items: itemList = [] } = (await driver.listItems({
      criteria: {
        logicalOperator: LogicalOperators.AND,
        fieldCriteria: [
          {
            fieldName: DBRelationshipItemKeys.fromTypeName,
            operator: ComparisonOperators.EQUALS,
            value: fromTypeName,
          },
          {
            fieldName: DBRelationshipItemKeys.fromTypePrimaryFieldValue,
            operator: ComparisonOperators.EQUALS,
            value: fromTypePrimaryFieldValue,
          },
          {
            fieldName: DBRelationshipItemKeys.fromTypeFieldName,
            operator: ComparisonOperators.EQUALS,
            value: fromTypeFieldName,
          },
          {
            fieldName: DBRelationshipItemKeys.toTypePrimaryFieldValue,
            operator: ComparisonOperators.EQUALS,
            value: toTypePrimaryFieldValue,
          },
        ],
      },
      checkExistence: false,
    })) as ListItemResults<DBRelationshipItem>;

    for (const item of itemList) {
      const { id: itemId } = item;

      await driver.deleteItem(itemId);
    }

    return true;
  };

  /**
   * List the relationships for a given item.
   * */
  listRelationships = async (
    config: ListRelationshipsConfig,
  ): Promise<boolean | ListItemResults<DBRelationshipItem>> => {
    const { relationshipItemOrigin, checkExistence, ...remainingConfig } =
      config;
    this.validateRelationshipItem(relationshipItemOrigin);

    const { fromTypeName, fromTypeFieldName, fromTypePrimaryFieldValue } =
      relationshipItemOrigin;
    const driver = this.getRelationshipDriverInternal(
      fromTypeName,
      fromTypeFieldName,
    );
    const results = await driver.listItems({
      ...remainingConfig,
      checkExistence,
      criteria: {
        logicalOperator: LogicalOperators.AND,
        fieldCriteria: [
          {
            fieldName: DBRelationshipItemKeys.fromTypeName,
            operator: ComparisonOperators.EQUALS,
            value: fromTypeName,
          },
          {
            fieldName: DBRelationshipItemKeys.fromTypeFieldName,
            operator: ComparisonOperators.EQUALS,
            value: fromTypeFieldName,
          },
          {
            fieldName: DBRelationshipItemKeys.fromTypePrimaryFieldValue,
            operator: ComparisonOperators.EQUALS,
            value: fromTypePrimaryFieldValue,
          },
        ],
      },
    });

    return results;
  };

  /**
   * Queue the cleanup of relationships for a given item.
   * */
  cleanupRelationships = async (
    relationshipOriginatingItem: DBRelationshipOriginatingItem,
  ): Promise<void> => {
    if (this.config.createRelationshipCleanupItem) {
      await this.config.createRelationshipCleanupItem(
        relationshipOriginatingItem,
      );
    }
  };

  /**
   * Create a new item of the given type.
   * */
  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    this.validate(typeName, item, TypeOperation.create);

    const driver = this.getDriverInternal(typeName);
    const newIdentifier = await driver.createItem(item);

    return newIdentifier;
  };

  /**
   * Read an existing item of the given type.
   * */
  read = async (
    typeName: string,
    primaryFieldValue: any,
  ): Promise<TypeInfoDataItem> => {
    const driver = this.getDriverInternal(typeName);
    const item = await driver.readItem(primaryFieldValue);

    // TODO: ACLs/Access Control. How to achieve fine grain control over who can access what exactly.

    return item;
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
    this.validate(typeName, item, TypeOperation.update, true);

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
      const result = await driver.updateItem(item);

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
  ): Promise<boolean | ListItemResults<TypeInfoDataItem>> => {
    // TODO: Validation???
    //   - no related fields allowed
    //   - field must exist
    //   - field must be readable
    //   - operator must apply to field type

    const driver = this.getDriverInternal(typeName);
    // TODO: Need to access items through `read` to comply with ACLs/Access Control.
    // TODO: IMPORTANT: Existence checks should not return true if any existing items are not accessible.
    const results = await driver.listItems(config);

    return results;
  };
}
