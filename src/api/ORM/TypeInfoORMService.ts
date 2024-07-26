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

  create = async (typeName: string, item: Record<any, any>): Promise<any> => {
    const validationResults = validateTypeInfoValue(
      item,
      typeName,
      this.typeInfoMap,
      true,
      this.customValidators,
      "create",
    );

    if (validationResults.valid) {
      const driver = this.getDriver(typeName);
      const newItem = await driver.createItem(item);

      // TODO: NESTING: No nesting, just id references
      //  OR maybe nothing at all and use a separate API for relationships.
      // TODO: Should `readonly` add denials for all other operations on a field???
      // TODO: Is there a solid, simple way to do pattern validation on field values???

      return newItem;
    } else {
      throw validationResults;
    }
  };
}
