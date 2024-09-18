import { FC, useCallback, useMemo } from "react";
import {
  TypeInfo,
  TypeInfoMap,
  TypeOperation,
} from "../../../../../common/TypeParsing/TypeInfo";
import { TypeInfoDataItem, TypeNavigation } from "../../Types";
import { ItemFieldCell } from "./ItemFieldCell";

export type ItemRowProps = {
  typeInfoMap: TypeInfoMap;
  index: number;
  typeInfoName: string;
  typeInfo: TypeInfo;
  operation: TypeOperation;
  item: TypeInfoDataItem;
  onNavigateToType: (typeNavigation: TypeNavigation) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelection?: (index: number) => void;
};

export const ItemRow: FC<ItemRowProps> = ({
  typeInfoMap,
  index,
  typeInfoName,
  typeInfo,
  operation,
  item,
  onNavigateToType,
  selectable,
  selected,
  onToggleSelection,
}) => {
  const { primaryField, fields = {} } = typeInfo;
  const primaryFieldValue = useMemo<any>(
    () =>
      typeof item === "object" && item !== null
        ? item[primaryField as keyof object]
        : undefined,
    [item, primaryField],
  );
  const fieldNameList = useMemo<string[]>(() => Object.keys(fields), [fields]);
  const cleanItemObject = useMemo<TypeInfoDataItem>(
    () => (typeof item === "object" && item !== null ? item : {}),
    [item],
  );
  const onToggleSelectionInternal = useCallback(() => {
    if (onToggleSelection) {
      onToggleSelection(index);
    }
  }, [index, onToggleSelection]);

  return (
    <tr>
      {selectable ? (
        <td>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelectionInternal}
          />
        </td>
      ) : undefined}
      {fieldNameList.map((fieldName, index) => {
        const typeInfoField = fields[fieldName];
        const fieldValue = cleanItemObject[fieldName];

        return (
          <ItemFieldCell
            key={`ItemField:${fieldName}:${index}`}
            typeInfoMap={typeInfoMap}
            typeInfoName={typeInfoName}
            operation={operation}
            itemPrimaryFieldValue={primaryFieldValue}
            fieldName={fieldName}
            typeInfoField={typeInfoField}
            fieldValue={fieldValue}
            onNavigateToType={onNavigateToType}
          />
        );
      })}
    </tr>
  );
};
