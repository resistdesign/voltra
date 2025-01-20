import {
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
  TYPE_INFO_ORM_SERVICE_ERRORS,
  TypeInfoORMAPI,
} from "../../common/TypeInfoORM";
import { DataItemDBDriver, ItemRelationshipDBDriver } from "./drivers";
import {
  removeNonexistentFieldsFromDataItem,
  removeNonexistentFieldsFromSelectedFields,
  removeTypeReferenceFieldsFromDataItem,
  removeTypeReferenceFieldsFromSelectedFields,
} from "../../common/TypeParsing/Utils";

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

/**
 * The configuration for the TypeInfoORM service.
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
};

// TODO: Integrate DAC. 📛
// TODO: IMPORTANT: Make sure all selected fields are valid fields.
// TODO: Cleaning relational, nonexistent and selected fields SHOULD be done at the `TypeInfoORMService` level.
//   - Clean relational fields where applicable. Use the utils.
//     - [x] create
//     - [x] update
//     - [] list
//   - Clean nonexistent fields where applicable. Use a utils.
//     - [x] create
//     - [x] update
//     - [] list
//   - Clean nonexistent selected fields where applicable. Use the utils.
//     - [x] read
//     - [] list
//   - Clean relational selected fields where applicable. Use the utils.
//     - [x] read
//     - [] list
//   - import {
//   -   removeNonexistentFieldsFromDataItem,
//   -   removeTypeReferenceFieldsFromDataItem,
//   -   removeNonexistentFieldsFromSelectedFields,
//   -   removeTypeReferenceFieldsFromSelectedFields,
//   - } from "../../../../common/TypeParsing/Utils";
// TODO: Error Types SHOULD be defined at the Driver API level.

/**
 * A service using TypeInfo to perform ORM operations with one or many `DBServiceItemDriver` instances.
 * */
export class TypeInfoORMService implements TypeInfoORMAPI {
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
  ): DataItemDBDriver<any, any> => {
    const driver = this.config.getDriver(typeName);

    if (!driver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_DRIVER);
    }

    return driver;
  };

  protected getRelationshipDriverInternal = (
    typeName: string,
    fieldName: string,
  ): ItemRelationshipDBDriver => {
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

    // TODO: Field value type validation.

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  protected getCleanItem = (
    typeName: string,
    item: TypeInfoDataItem,
  ): TypeInfoDataItem => {
    const typeInfo = this.getTypeInfo(typeName);
    const cleanItem = removeTypeReferenceFieldsFromDataItem(
      typeInfo,
      removeNonexistentFieldsFromDataItem(typeInfo, item),
    );

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
    relationshipItem: BaseItemRelationshipInfo,
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
    // TODO: This is not robust in big data environments. Cursors/Queues???
    const { items: itemList = [] } = (await driver.listItems({
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

    return true;
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

    const driver = this.getDriverInternal(typeName);
    const cleanItem = this.getCleanItem(typeName, item);
    const newIdentifier = await driver.createItem(cleanItem);

    return newIdentifier;
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
    const item = await driver.readItem(primaryFieldValue, cleanSelectedFields);

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
    // TODO: Handle `possibleValues` (use `value` || `valueOptions` in all criteria) at ORM Service level.
    // CODE FROM DynamoDBDriver:
    // IMPORTANT: Only allow searching for `possibleValues` when supplied.
    // if (
    //   Array.isArray(possibleValues) &&
    //   ((Array.isArray(valueOptions) &&
    //     !valueOptions.every((vO) => possibleValues.includes(vO))) ||
    //     !possibleValues.includes(value))
    // ) {
    //   throw {
    //     message: DYNAMODB_DATA_ITEM_DB_DRIVER_ERRORS.INVALID_CRITERION_VALUE,
    //     fieldName,
    //     value,
    //   };
    // }
    const { fields: {} = {} } = this.getTypeInfo(typeName);
    const { criteria } = config;
    const { fieldCriteria = [] }: Partial<SearchCriteria> = criteria || {};
    // TODO: Clean all `fieldCriteria` fields based on existing and non-relational.
    // TODO: Clean all `fieldCriteria` values and valueOptions based on possibleValues.
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
