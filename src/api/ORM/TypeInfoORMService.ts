import { DBServiceItemDriver } from "./ServiceTypes";
import {
  TypeInfo,
  TypeInfoMap,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  RelationshipValidationType,
  validateTypeInfoValue,
} from "../../common/TypeParsing/Validation";
import { TypeInfoDataItem } from "../../app/components";

export const TypeInfoORMServiceErrors = {
  NO_DRIVERS_SUPPLIED: "NO_DRIVERS_SUPPLIED",
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  INVALID_DRIVER: "INVALID_DRIVER",
};

export class TypeInfoORMService {
  constructor(
    protected typeInfoMap: TypeInfoMap,
    protected driver?: DBServiceItemDriver<any, any>,
    protected getDriver?: (typeName: string) => DBServiceItemDriver<any, any>,
    protected customValidators?: CustomTypeInfoFieldValidatorMap,
  ) {
    if (!driver && !getDriver) {
      throw new Error(TypeInfoORMServiceErrors.NO_DRIVERS_SUPPLIED);
    }
  }

  protected getTypeInfo = (typeName: string): TypeInfo => {
    const typeInfo = this.typeInfoMap[typeName];

    if (!typeInfo) {
      throw new Error(TypeInfoORMServiceErrors.INVALID_TYPE_INFO);
    }

    return typeInfo;
  };

  protected getDriverInternal = (
    typeName: string,
  ): DBServiceItemDriver<any, any> => {
    const driver = this.driver
      ? this.driver
      : this.getDriver
        ? this.getDriver(typeName)
        : undefined;

    if (!driver) {
      throw new Error(TypeInfoORMServiceErrors.INVALID_DRIVER);
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
      this.typeInfoMap,
      true,
      this.customValidators,
      typeOperation,
      RelationshipValidationType.STRICT_EXCLUDE,
    );

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    this.validate(typeName, item, TypeOperation.create);

    const driver = this.getDriverInternal(typeName);
    const newItem = await driver.createItem(item);

    // TODO: NESTING: No nesting, just id references
    //  OR maybe nothing at all and use a separate API for relationships.

    return newItem;
  };
}
