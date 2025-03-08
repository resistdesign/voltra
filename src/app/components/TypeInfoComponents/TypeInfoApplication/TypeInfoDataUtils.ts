import { useCallback, useMemo } from "react";
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
  currentFromTypeName,
  currentFromTypePrimaryFieldValue,
  onBaseValueChange,
}: {
  baseValue: TypeInfoDataStructure;
  toTypeInfoName: string;
  currentOperation: TypeOperation;
  currentFromTypeName: string;
  currentFromTypePrimaryFieldValue: string;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
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
  const onCurrentDataItemChange = useCallback(
    (newDataItem: TypeInfoDataItem) => {
      onBaseValueChange({
        ...baseValue,
        [currentFromTypeName]: {
          ...currentTypeDataStateMap,
          [currentOperation]: {
            ...currentTypeInfoDataMap,
            [currentFromTypePrimaryFieldValue]: newDataItem,
          },
        },
      });
    },
    [
      baseValue,
      currentFromTypeName,
      currentTypeDataStateMap,
      currentOperation,
      currentTypeInfoDataMap,
      currentFromTypePrimaryFieldValue,
      onBaseValueChange,
    ],
  );

  return {
    currentTypeDataStateMap,
    currentTypeInfoDataMap,
    currentDataItem,
    onCurrentDataItemChange,
  };
};
