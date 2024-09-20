import { TypeNavigation } from "./Types";
import { TypeInfo, TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";

export const isValidTypeNavigation = (
  typeNavigation: TypeNavigation,
  typeInfoMap: TypeInfoMap,
): boolean => {
  const { fromTypeName, fromTypeFieldName } = typeNavigation;
  const sourceTypeInfo: TypeInfo | undefined = typeInfoMap[fromTypeName];

  let valid = false;

  if (sourceTypeInfo) {
    const {
      fields: { [fromTypeFieldName]: { typeReference = undefined } = {} } = {},
    } = sourceTypeInfo;
    const destinationTypeInfo: TypeInfo | undefined =
      typeInfoMap[typeReference as keyof TypeInfoMap];

    if (destinationTypeInfo) {
      valid = true;
    }
  }

  return valid;
};
