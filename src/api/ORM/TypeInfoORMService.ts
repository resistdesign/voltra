import {
  DBRelatedItemDriver,
  DBRelationshipItem,
  DBServiceItemDriver,
} from "./ServiceTypes";
import { TypeInfoMap, TypeOperation } from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  RelationshipValidationType,
  validateRelationshipItem,
  validateTypeInfoValue,
} from "../../common/TypeParsing/Validation";
import { TypeInfoDataItem } from "../../app/components";

export const TYPE_INFO_ORM_SERVICE_ERRORS = {
  NO_DRIVERS_SUPPLIED: "NO_DRIVERS_SUPPLIED",
  NO_RELATIONSHIP_DRIVERS_SUPPLIED: "NO_RELATIONSHIP_DRIVERS_SUPPLIED",
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  INVALID_DRIVER: "INVALID_DRIVER",
  INVALID_RELATIONSHIP_DRIVER: "INVALID_RELATIONSHIP_DRIVER",
};

export type TypeInfoORMServiceConfig = {
  typeInfoMap: TypeInfoMap;
  driver?: DBServiceItemDriver<any, any>;
  getDriver?: (typeName: string) => DBServiceItemDriver<any, any>;
  relationshipDriver?: DBRelatedItemDriver;
  getRelationshipDriver?: (
    typeName: string,
    fieldName: string,
  ) => DBRelatedItemDriver;
  customValidators?: CustomTypeInfoFieldValidatorMap;
};

export class TypeInfoORMService {
  constructor(protected config: TypeInfoORMServiceConfig) {
    if (!config.driver && !config.getDriver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.NO_DRIVERS_SUPPLIED);
    }

    if (!config.relationshipDriver && !config.getRelationshipDriver) {
      throw new Error(
        TYPE_INFO_ORM_SERVICE_ERRORS.NO_RELATIONSHIP_DRIVERS_SUPPLIED,
      );
    }
  }

  protected getDriverInternal = (
    typeName: string,
  ): DBServiceItemDriver<any, any> => {
    const driver = this.config.driver
      ? this.config.driver
      : this.config.getDriver
        ? this.config.getDriver(typeName)
        : undefined;

    if (!driver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_DRIVER);
    }

    return driver;
  };

  protected getRelationshipDriverInternal = (
    typeName: string,
    fieldName: string,
  ): DBRelatedItemDriver => {
    const driver = this.config.relationshipDriver
      ? this.config.relationshipDriver
      : this.config.getRelationshipDriver
        ? this.config.getRelationshipDriver(typeName, fieldName)
        : undefined;

    if (!driver) {
      throw new Error(TYPE_INFO_ORM_SERVICE_ERRORS.INVALID_RELATIONSHIP_DRIVER);
    }

    return driver;
  };

  protected validate = (
    typeName: string,
    item: TypeInfoDataItem,
    typeOperation: TypeOperation,
  ) => {
    const validationResults = validateTypeInfoValue(
      item,
      typeName,
      this.config.typeInfoMap,
      true,
      this.config.customValidators,
      typeOperation,
      RelationshipValidationType.STRICT_EXCLUDE,
    );

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  protected validateRelationshipItem = (
    relationshipItem: DBRelationshipItem,
  ) => {
    const validationResults = validateRelationshipItem(relationshipItem);

    // TODO: Validate against type info. Make sure that such a relationship exists.

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  /**
   * Create a new relationship between two items.
   * */
  createRelationship = async (
    relationshipItem: DBRelationshipItem,
  ): Promise<boolean> => {
    // TODO: Clean the relationship item.
  };

  /**
   * Create a new item of the given type.
   * */
  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    this.validate(typeName, item, TypeOperation.create);

    const driver = this.getDriverInternal(typeName);
    const newItem = await driver.createItem(item);

    return newItem;
  };
}
