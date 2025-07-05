import { InputComponent } from "../Types";
import { useCallback } from "react";
import { MaterialSymbol } from "../../MaterialSymbol";
import { TypeOperation } from "../../../../common/TypeParsing/TypeInfo";

export const ObjectSelector: InputComponent<HTMLButtonElement> = ({
  operation,
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

  return operation !== TypeOperation.CREATE ? (
    <button type="button" onClick={onClick}>
      <MaterialSymbol>edit_square</MaterialSymbol>
    </button>
  ) : undefined;
};
