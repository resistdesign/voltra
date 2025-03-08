import { useMemo } from "react";
import {
  TypeDataStateMap,
  TypeInfoDataMap,
  TypeInfoDataStructure,
} from "../Types";
import {
  TypeInfoDataItem,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";

export const useTypeInfoDataStore = ({
  baseValue,
  toTypeInfoName,
  currentOperation,
  currentFromTypePrimaryFieldValue,
}: {
  baseValue: TypeInfoDataStructure;
  toTypeInfoName: string;
  currentOperation: TypeOperation;
  currentFromTypePrimaryFieldValue: string;
}) => {
  const currentTypeDataStateMap = useMemo<TypeDataStateMap>(
    () => baseValue[toTypeInfoName],
    [baseValue, toTypeInfoName],
  );
  const currentTypeInfoDataMap = useMemo<TypeInfoDataMap>(
    () => currentTypeDataStateMap[currentOperation],
    [currentTypeDataStateMap, currentOperation],
  );
  const currentDataItem = useMemo<TypeInfoDataItem>(
    () => currentTypeInfoDataMap[currentFromTypePrimaryFieldValue],
    [currentTypeInfoDataMap, currentFromTypePrimaryFieldValue],
  );

  return {
    currentTypeDataStateMap,
    currentTypeInfoDataMap,
    currentDataItem,
  };
};
