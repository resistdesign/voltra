import { TypeInfo } from "../TypeInfo";

export enum TypeInfoPrimaryFieldErrors {
  READ_DENIED_PRIMARY_FIELD_NOT_SUPPORTED = "READ_DENIED_PRIMARY_FIELD_NOT_SUPPORTED",
}

export const getPrimaryFieldForTypeInfo = (
  typeInfo: TypeInfo,
): string | undefined => {
  const { fields } = typeInfo;

  let primaryField: string | undefined = undefined,
    primaryFieldReadDenied: boolean = false;

  for (const fieldName in fields) {
    const field = fields[fieldName];
    const {
      tags: {
        primaryField: isPrimaryField = false,
        deniedOperations: { READ: readDenied = false } = {},
      } = {},
    } = field;

    if (isPrimaryField || !primaryField) {
      primaryField = fieldName;
      primaryFieldReadDenied = readDenied;
    }

    if (isPrimaryField) {
      break;
    }
  }

  if (primaryFieldReadDenied) {
    throw new Error(
      TypeInfoPrimaryFieldErrors.READ_DENIED_PRIMARY_FIELD_NOT_SUPPORTED,
    );
  }

  return primaryField;
};
