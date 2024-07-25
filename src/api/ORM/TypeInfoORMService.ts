import { DBServiceItemDriver } from "./ServiceTypes";
import {
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
  TypeOperation,
} from "../../common/TypeParsing/TypeInfo";
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
  DENIED_TYPE_OPERATION: {
    CREATE: "DENIED_TYPE_OPERATION_CREATE",
    READ: "DENIED_TYPE_OPERATION_READ",
    UPDATE: "DENIED_TYPE_OPERATION_UPDATE",
    DELETE: "DENIED_TYPE_OPERATION_DELETE",
  },
};

export const getTypeOperationAllowed = (
  typeOperation: TypeOperation,
  typeInfo: TypeInfo,
) => {
  const { tags = {} } = typeInfo;
  const { deniedOperations: { [typeOperation]: denied = false } = {} } = tags;

  return !denied;
};

export const getTypeFieldOperationAllowed = (
  typeOperation: TypeOperation,
  typeInfo: TypeInfo,
  fieldName: string,
) => {
  const { fields = {} } = typeInfo;
  const { [fieldName]: typeInfoField = {} } = fields;
  const { tags = {} }: Partial<TypeInfoField> = typeInfoField;
  const { deniedOperations: { [typeOperation]: denied = false } = {} } = tags;

  return !denied;
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
    const typeInfo = this.getTypeInfo(typeName);

    if (!getTypeOperationAllowed("create", typeInfo)) {
      throw new Error(TypeInfoORMServiceErrors.DENIED_TYPE_OPERATION.CREATE);
    } else {
      const driver = this.getDriver(typeName);
      const { valid, errorMap } = validateTypeInfoValue(
        item,
        typeName,
        this.typeInfoMap,
        true,
        this.customValidators,
      );

      // TODO: NESTING: No nesting, just id references
      //  OR maybe nothing at all and use a separate API for relationships.
      // TODO: Allowed Field operations. CLEAN ITEM!!!

      if (valid) {
        const newItem = await driver.createItem(item);

        return newItem;
      } else {
        throw errorMap;
      }
    }
  };
}
