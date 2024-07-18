import { FC } from "react";
import { SearchCriteria } from "../../../../common/SearchTypes";
import { TypeInfoDataItem } from "../Types";
import { TypeInfo } from "../../../../common/TypeParsing/TypeInfo";
import { ObjectTable } from "./ObjectTable";

// TODO: Search criteria interface.

export type ObjectSearchProps = {
  typeInfo: TypeInfo;
  searchCriteria: SearchCriteria;
  searchResults: TypeInfoDataItem[];
};

export const ObjectSearch: FC<ObjectSearchProps> = ({
  typeInfo,
  searchCriteria,
  searchResults = [],
}) => {
  return <ObjectTable typeInfo={typeInfo} objectList={searchResults} />;
};
