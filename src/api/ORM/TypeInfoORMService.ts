import { DBServiceItemDriver } from "./ServiceTypes";
import {
  TypeInfo,
  TypeInfoMap,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  validateTypeInfoValue,
} from "../../common/TypeParsing/Validation";
import { TypeInfoDataItem } from "../../app/components";

export type DBServiceItemDriverMap = Record<
  string,
  DBServiceItemDriver<any, any>
>;

export const TypeInfoORMServiceErrors = {
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  INVALID_DRIVER: "INVALID_DRIVER",
};

export class TypeInfoORMService {
  constructor(
    protected typeInfoMap: TypeInfoMap,
    protected driverMap: DBServiceItemDriverMap,
    protected customValidators?: CustomTypeInfoFieldValidatorMap,
  ) {}

  protected getTypeInfo = (typeName: string): TypeInfo => {
    const typeInfo = this.typeInfoMap[typeName];

    if (!typeInfo) {
      throw new Error(TypeInfoORMServiceErrors.INVALID_TYPE_INFO);
    }

    return typeInfo;
  };

  protected getDriver = (typeName: string): DBServiceItemDriver<any, any> => {
    const driver = this.driverMap[typeName];

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
    );

    if (!validationResults.valid) {
      throw validationResults;
    }
  };

  create = async (typeName: string, item: TypeInfoDataItem): Promise<any> => {
    this.validate(typeName, item, TypeOperation.create);

    const driver = this.getDriver(typeName);
    const newItem = await driver.createItem(item);

    // TODO: NESTING: No nesting, just id references
    //  OR maybe nothing at all and use a separate API for relationships.
    // TODO: Should there even be a driver MAP???

    return newItem;
  };
}
