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
  typeInfoDataStructure,
  onTypeInfoDataStructureChange,
  typeName,
  operation,
  primaryFieldValue,
}: {
  typeInfoDataStructure: TypeInfoDataStructure;
  onTypeInfoDataStructureChange: (
    typeInfoDataStructure: TypeInfoDataStructure,
  ) => void;
  typeName?: string;
  operation?: TypeOperation;
  primaryFieldValue?: string;
}) => {
  const typeDataStateMap = useMemo<TypeDataStateMap | undefined>(
    () =>
      typeof typeName !== "undefined"
        ? typeInfoDataStructure[typeName]
        : undefined,
    [typeInfoDataStructure, typeName],
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
        typeof typeInfoDataStructure !== "undefined"
      ) {
        onTypeInfoDataStructureChange({
          ...typeInfoDataStructure,
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
      typeInfoDataStructure,
      typeName,
      typeDataStateMap,
      operation,
      typeInfoDataMap,
      primaryFieldValue,
      onTypeInfoDataStructureChange,
    ],
  );

  return {
    dataItem,
    onDataItemChange,
  };
};
