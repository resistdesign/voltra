import { InputComponent } from "../Types";
import { useCallback } from "react";

export const ObjectSelector: InputComponent<HTMLButtonElement> = ({
  nameOrIndex,
  typeInfoField,
  onNavigateToType,
}) => {
  const onClick = useCallback(() => {
    if (typeInfoField && onNavigateToType) {
      const { typeReference } = typeInfoField;

      if (typeReference) {
        onNavigateToType(nameOrIndex);
      }
    }
  }, [nameOrIndex, typeInfoField, onNavigateToType]);

  return (
    <button type="button" onClick={onClick}>
      Edit...{/* TODO: i18n */}
    </button>
  );
};
