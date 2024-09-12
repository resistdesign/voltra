import { InputComponent } from "../Types";
import { useCallback } from "react";
import { MaterialSymbol } from "../../MaterialSymbol";

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
      <MaterialSymbol>edit_square</MaterialSymbol>
    </button>
  );
};
