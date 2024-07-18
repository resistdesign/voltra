import { FC } from "react";
import {TypeInfo, TypeInfoMap} from "../../../common/TypeParsing/TypeInfo";
import { TypeInfoDataItem } from "./Types";

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
