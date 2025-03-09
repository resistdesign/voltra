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
  currentTypeName,
  currentTypePrimaryFieldValue,
  onBaseValueChange,
}: {
  baseValue: TypeInfoDataStructure;
  toTypeInfoName?: string;
  currentOperation?: TypeOperation;
  currentTypeName?: string;
  currentTypePrimaryFieldValue?: string;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
}) => {
  const currentTypeDataStateMap = useMemo<TypeDataStateMap | undefined>(
    () =>
      typeof toTypeInfoName !== "undefined"
        ? baseValue[toTypeInfoName]
        : undefined,
    [baseValue, toTypeInfoName],
  );
  const currentTypeInfoDataMap = useMemo<TypeInfoDataMap | undefined>(
    () =>
      typeof currentTypeDataStateMap !== "undefined" &&
      typeof currentOperation !== "undefined"
        ? currentTypeDataStateMap[currentOperation]
        : undefined,
    [currentTypeDataStateMap, currentOperation],
  );
  const currentDataItem = useMemo<TypeInfoDataItem | undefined>(
    () =>
      typeof currentTypeInfoDataMap !== "undefined" &&
      typeof currentTypePrimaryFieldValue !== "undefined"
        ? currentTypeInfoDataMap[currentTypePrimaryFieldValue]
        : undefined,
    [currentTypeInfoDataMap, currentTypePrimaryFieldValue],
  );
  const onCurrentDataItemChange = useCallback(
    (newDataItem: TypeInfoDataItem) => {
      if (
        typeof currentTypeName !== "undefined" &&
        typeof currentOperation !== "undefined" &&
        typeof currentTypePrimaryFieldValue !== "undefined" &&
        typeof baseValue !== "undefined" &&
        typeof currentTypeDataStateMap !== "undefined" &&
        typeof currentTypeInfoDataMap !== "undefined"
      ) {
        onBaseValueChange({
          ...baseValue,
          [currentTypeName]: {
            ...currentTypeDataStateMap,
            [currentOperation]: {
              ...currentTypeInfoDataMap,
              [currentTypePrimaryFieldValue]: newDataItem,
            },
          },
        });
      }
    },
    [
      baseValue,
      currentTypeName,
      currentTypeDataStateMap,
      currentOperation,
      currentTypeInfoDataMap,
      currentTypePrimaryFieldValue,
      onBaseValueChange,
    ],
  );

  return {
    currentDataItem,
    onCurrentDataItemChange,
  };
};
