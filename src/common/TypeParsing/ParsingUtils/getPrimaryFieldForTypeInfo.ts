import { TypeInfo } from "../TypeInfo";

export const getPrimaryFieldForTypeInfo = (
  typeInfo: TypeInfo,
): string | undefined => {
  const { fields } = typeInfo;

  let primaryField: string | undefined = undefined;

  for (const fieldName in fields) {
    const field = fields[fieldName];
    const { tags: { primaryField: isPrimaryField = false } = {} } = field;

    if (isPrimaryField || !primaryField) {
      primaryField = fieldName;
    }
  }

  return primaryField;
};
