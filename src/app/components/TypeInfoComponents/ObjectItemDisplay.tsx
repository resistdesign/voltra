import { FC } from "react";
import {TypeInfo, TypeInfoDataItem, TypeInfoMap} from "../../../common/TypeParsing/TypeInfo";

export type ObjectItemDisplayProps = {
  typeInfoMap: TypeInfoMap;
  typeInfo: TypeInfo;
  value: TypeInfoDataItem;
};

// TODO: How to display nested items.

export const ObjectItemDisplay: FC<ObjectItemDisplayProps> = ({
  typeInfoMap,
  typeInfo,
  value,
}) => {


  return <div></div>;
};
