import { FC, useCallback, useMemo, useState } from "react";
import { TypeInfoForm } from "./TypeInfoForm";
import { TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  TypeInfoDataItem,
  TypeInfoDataItemOperation,
  TypeInfoDataStructure,
  TypeNavigation,
} from "./Types";

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  operation?: TypeInfoDataItemOperation;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataStructure;
  onChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
};

export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  typeInfoName,
  operation = "create",
  customInputTypeMap,
  value,
  onChange,
}) => {
  const [typeNavigationHistory, setTypeNavigationHistory] = useState<
    TypeNavigation[]
  >([
    {
      typeName: typeInfoName,
      fieldName: "",
      operation,
      // TODO: Need a way to create a *temporary* primary field value.
      // TODO: Relationships*:
      //   - How to get the real primary field value when creating.
      //   - Where to store it once the real primary field is acquired.
      primaryKeyValue: "",
    },
  ]);
  const onNavigateToType = useCallback(
    (typeNavigation: TypeNavigation) => {
      setTypeNavigationHistory((prevTypeNavigationHistory) => [
        ...prevTypeNavigationHistory,
        typeNavigation,
      ]);
    },
    [setTypeNavigationHistory],
  );
  const {
    typeName: currentTypeName,
    // TODO: Store the relationship primary field value.
    fieldName: currentFieldName,
    operation: currentOperation,
    primaryKeyValue: currentPrimaryFieldValue,
  } = useMemo(() => {
    return typeNavigationHistory?.[typeNavigationHistory.length - 1];
  }, [typeNavigationHistory]);
  const currentTypeInfo = useMemo(() => {
    return typeInfoMap[currentTypeName];
  }, [currentTypeName, typeInfoMap]);
  const currentTypeInfoPrimaryField = useMemo(() => {
    return currentTypeInfo?.primaryField;
  }, [currentTypeInfo]);
  const currentDataItem = useMemo<TypeInfoDataItem>(() => {
    return (
      value?.[currentTypeName]?.[currentOperation]?.[
        currentPrimaryFieldValue
      ] ?? {}
    );
  }, [currentTypeName, currentOperation, currentPrimaryFieldValue, value]);
  const onCurrentDataItemChange = useCallback(
    // TODO: *How to return from type navigation and apply the new value to the related field on the correct object.
    // TODO: What is the UX around Done VS Submit????
    (newDataItem: TypeInfoDataItem = {}) => {
      onChange({
        ...value,
        [currentTypeName]: {
          ...value[currentTypeName],
          [currentOperation]: {
            ...value[currentTypeName]?.[currentOperation],
            [currentPrimaryFieldValue]: newDataItem,
          },
        },
      });
    },
    [
      currentTypeName,
      currentOperation,
      currentPrimaryFieldValue,
      onChange,
      value,
    ],
  );

  return currentTypeInfo ? (
    <TypeInfoForm
      typeInfo={currentTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      onChange={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  ) : undefined;
};
