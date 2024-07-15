import { InputComponent } from "../Types";
import { useCallback } from "react";

export const ObjectSelector: InputComponent<HTMLButtonElement> = ({
  nameOrIndex,
  typeInfoField,
  value,
  onNavigateToType,
}) => {
  const onClick = useCallback(() => {
    if (typeInfoField && onNavigateToType) {
      const { typeReference } = typeInfoField;

      if (typeReference) {
        onNavigateToType({
          typeName: typeReference,
          fieldNameOrIndex: nameOrIndex,
          operation: typeof value === "undefined" ? "create" : "update",
          primaryKeyValue: value,
        });
      }
    }
  }, [nameOrIndex, typeInfoField, value, onNavigateToType]);

  return (
    <button type="button" onClick={onClick}>
      Edit...{/* TODO: i18n */}
    </button>
  );
};
