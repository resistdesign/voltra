import {
  type TypeInfo,
  type TypeInfoMap,
  TypeInfoORMServiceError,
} from "@resistdesign/voltra/common";

/**
 * Shared/common type reference examples.
 */
export const typeInfoExample: TypeInfo = {
  typeName: "User",
};
export const typeInfoMapExample: TypeInfoMap = {
  User: typeInfoExample,
};
export const ormErrorExample = TypeInfoORMServiceError.INVALID_OPERATION;
