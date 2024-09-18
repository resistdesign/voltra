import { FC, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
  TypeOperation,
} from "../../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation, TypeNavigationMode } from "../../Types";
import { ItemButton } from "../../../Basic/ItemButton";
import { MaterialSymbol } from "../../../MaterialSymbol";
import { transformValueToString } from "../../../../../common/StringTransformers";

export type ItemFieldCellProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  operation: TypeOperation;
  itemPrimaryFieldValue: any;
  fieldName: string;
  typeInfoField: TypeInfoField;
  fieldValue: any;
  onNavigateToType: (typeNavigation: TypeNavigation) => void;
};

export const ItemFieldCell: FC<ItemFieldCellProps> = ({
  typeInfoMap,
  typeInfoName,
  operation,
  itemPrimaryFieldValue,
  fieldName,
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
  const typeNavigation = useMemo<TypeNavigation | undefined>(() => {
    // IMPORTANT: Do not allow navigation to types if they are tagged to deny the current operation.
    const {
      tags: {
        deniedOperations: {
          [operation]: targetTypeOperationDenied = false,
        } = {},
      } = {},
    }: Partial<TypeInfo> = typeReference
      ? typeInfoMap[typeReference as keyof TypeInfoMap] || {}
      : {};
    const tN =
      typeReference &&
      !targetTypeOperationDenied &&
      typeof itemPrimaryFieldValue !== "undefined"
        ? {
            fromTypeName: typeInfoName,
            fromTypePrimaryFieldValue: itemPrimaryFieldValue,
            fromTypeFieldName: fieldName,
            mode: TypeNavigationMode.FORM,
            operation,
          }
        : undefined;

    return tN;
  }, [
    typeReference,
    typeInfoMap,
    itemPrimaryFieldValue,
    typeInfoName,
    fieldName,
    operation,
  ]);
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
