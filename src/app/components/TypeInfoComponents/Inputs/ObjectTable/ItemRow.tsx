import {FC, useMemo} from "react";
import {TypeInfo} from "../../../../../common/TypeParsing/TypeInfo";
import {TypeInfoDataItem, TypeNavigation} from "../../Types";

export type ItemRowProps = {
  index: number;
  typeInfo: TypeInfo;
  item: TypeInfoDataItem;
  onNavigateToType: (typeNavigation: TypeNavigation) => void;
};

export const ItemRow: FC<ItemRowProps> = ({
  index,
  typeInfo,
  item,
  onNavigateToType,
}) => {
  const {
    primaryField,
    fields,
  } = typeInfo;
  const primaryFieldValue = useMemo<any>(() => typeof item === "object" && item !== null
    ? item[primaryField as keyof object]
    : undefined, [
    item,
    primaryField,
  ]);

  return (
    <tr>

    </tr>
  );
};
