import { DBServiceItemDriver } from "./ServiceTypes";
import { TypeInfo, TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import {
  CustomTypeInfoFieldValidatorMap,
  validateTypeInfoValue,
} from "../../common/TypeParsing/Validation";

export type DBServiceItemDriverMap = Record<
  string,
  DBServiceItemDriver<any, any>
>;

export const TypeInfoORMServiceErrors = {
  INVALID_TYPE_INFO: "INVALID_TYPE_INFO",
  INVALID_DRIVER: "INVALID_DRIVER",
  INVALID_PRIMARY_FIELD: "INVALID_PRIMARY_FIELD",
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

  protected getPrimaryField = (typeInfo: TypeInfo): string => {
    const primaryField = typeInfo.primaryField;

    if (!primaryField) {
      throw new Error(TypeInfoORMServiceErrors.INVALID_PRIMARY_FIELD);
    }

    return primaryField;
  };

  protected getDriver = (typeName: string): DBServiceItemDriver<any, any> => {
    const driver = this.driverMap[typeName];

    if (!driver) {
      throw new Error(TypeInfoORMServiceErrors.INVALID_DRIVER);
    }

    return driver;
  };

  create = async (typeName: string, item: Record<any, any>): Promise<any> => {
    const typeInfo = this.getTypeInfo(typeName);
    const primaryField = this.getPrimaryField(typeInfo);
    const driver = this.getDriver(typeName);
    const { valid, errorMap } = validateTypeInfoValue(
      item,
      typeName,
      this.typeInfoMap,
      true,
      this.customValidators,
    );

    // TODO: Allowed Type operations.
    // TODO: Allowed Field operations.
    // TODO: Pattern Validation???

    if (valid) {
      const newItem = await driver.createItem(item);

      return newItem;
    } else {
      throw errorMap;
    }
  };
}
