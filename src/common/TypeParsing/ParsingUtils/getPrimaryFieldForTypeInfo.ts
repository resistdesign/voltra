import { TypeInfo } from "../TypeInfo";

export enum TypeInfoPrimaryFieldErrors {
  /**
   * Primary field cannot be read due to denied operations.
   * */
  READ_DENIED_PRIMARY_FIELD_NOT_SUPPORTED = "READ_DENIED_PRIMARY_FIELD_NOT_SUPPORTED",
}

/**
 * Resolve the primary field name for a TypeInfo definition.
 *
 * @param typeInfo - TypeInfo definition to inspect.
 * @returns Primary field name, if available.
 * @throws Error when the primary field is read-denied.
 */
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
