import { FC, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfoField,
  TypeOperation,
} from "../../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation, TypeNavigationMode } from "../../Types";
import { ItemButton } from "../../../Basic/ItemButton";
import { MaterialSymbol } from "../../../MaterialSymbol";
import { transformValueToString } from "../../../../../common/StringTransformers";

export type ItemFieldCellProps = {
  typeInfoName: string;
  operation: TypeOperation;
  typeInfoField: TypeInfoField;
  fieldValue: any;
  onNavigateToType: (typeNavigation: TypeNavigation) => void;
};

export const ItemFieldCell: FC<ItemFieldCellProps> = ({
  typeInfoName,
  operation,
  typeInfoField,
  fieldValue,
  onNavigateToType,
}) => {
  const { type, typeReference, tags = {}, array: fieldIsArray } = typeInfoField;
  const {
    hidden,
    customType,
    deniedOperations = {},
  } = tags as SupportedFieldTags;
  const { READ: readDenied = false } = deniedOperations;
  const typeNavigation = useMemo<TypeNavigation | undefined>(
    // TODO: Do not allow navigation to types if they are tagged to deny the current operation.
    // TODO: Get `deniedOperations` from the destination type.
    () =>
      typeReference
        ? {
            fromTypeName: typeInfoName,
            fromTypePrimaryFieldValue,
            fromTypeFieldName: fN,
            mode: TypeNavigationMode.FORM,
            operation,
          }
        : undefined,
    [
      // TODO: Fill out.
    ],
  );
  const hasValue = useMemo<boolean>(
    () =>
      (fieldIsArray &&
        Array.isArray(fieldValue) &&
        (fieldValue as any[]).length > 0) ||
      (!fieldIsArray &&
        typeof fieldValue !== "undefined" &&
        fieldValue !== null),
    [fieldIsArray],
  );

  return !readDenied && !hidden ? (
    <td>
      {typeReference ? (
        typeNavigation ? (
          <ItemButton item={typeNavigation} onClick={onNavigateToType}>
            <MaterialSymbol>
              {operation === TypeOperation.READ
                ? "manage_search"
                : hasValue
                  ? "edit_square"
                  : "add"}
            </MaterialSymbol>
          </ItemButton>
        ) : undefined
      ) : (
        transformValueToString(fieldValue, type, customType)
      )}
    </td>
  ) : undefined;
};
