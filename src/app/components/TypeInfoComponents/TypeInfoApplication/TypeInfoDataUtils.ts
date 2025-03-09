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
  onBaseValueChange,
  typeName,
  operation,
  primaryFieldValue,
}: {
  baseValue: TypeInfoDataStructure;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  typeName?: string;
  operation?: TypeOperation;
  primaryFieldValue?: string;
}) => {
  const typeDataStateMap = useMemo<TypeDataStateMap | undefined>(
    () =>
      typeof typeName !== "undefined"
        ? baseValue[typeName]
        : undefined,
    [baseValue, typeName],
  );
  const typeInfoDataMap = useMemo<TypeInfoDataMap | undefined>(
    () =>
      typeof typeDataStateMap !== "undefined" &&
      typeof operation !== "undefined"
        ? typeDataStateMap[operation]
        : undefined,
    [typeDataStateMap, operation],
  );
  const dataItem = useMemo<TypeInfoDataItem | undefined>(
    () =>
      typeof typeInfoDataMap !== "undefined" &&
      typeof primaryFieldValue !== "undefined"
        ? typeInfoDataMap[primaryFieldValue]
        : undefined,
    [typeInfoDataMap, primaryFieldValue],
  );
  const onDataItemChange = useCallback(
    (newDataItem: TypeInfoDataItem) => {
      if (
        typeof typeName !== "undefined" &&
        typeof operation !== "undefined" &&
        typeof primaryFieldValue !== "undefined" &&
        typeof baseValue !== "undefined" &&
        typeof typeDataStateMap !== "undefined" &&
        typeof typeInfoDataMap !== "undefined"
      ) {
        onBaseValueChange({
          ...baseValue,
          [typeName]: {
            ...typeDataStateMap,
            [operation]: {
              ...typeInfoDataMap,
              [primaryFieldValue]: newDataItem,
            },
          },
        });
      }
    },
    [
      baseValue,
      typeName,
      typeDataStateMap,
      operation,
      typeInfoDataMap,
      primaryFieldValue,
      onBaseValueChange,
    ],
  );

  return {
    dataItem,
    onDataItemChange,
  };
};
