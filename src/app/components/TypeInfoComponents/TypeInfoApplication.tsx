import { FC, useCallback, useMemo, useState } from "react";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  TypeDataStateMap,
  TypeInfoDataMap,
  TypeInfoDataStructure,
  TypeNavigation,
  TypeNavigationMode,
} from "./Types";
import { isValidTypeNavigation } from "./TypeNavigationUtils";

export type OperationMode = Exclude<TypeOperation, TypeOperation.DELETE>;
export type UpdateOperationMode = TypeOperation.UPDATE;
export type NonUpdateOperationMode = Exclude<
  OperationMode,
  UpdateOperationMode
>;

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataStructure;
  onChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  mode: TypeNavigationMode;
} & (
  | {
      operation: UpdateOperationMode;
      primaryKeyValue: string;
    }
  | {
      operation?: NonUpdateOperationMode;
      primaryKeyValue?: string;
    }
);

/**
 * Create a multi-type driven type information form application.
 * */
export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  typeInfoName,
  customInputTypeMap,
  value,
  onChange,
  mode = TypeNavigationMode.FORM,
  operation = TypeOperation.CREATE,
  primaryKeyValue,
}) => {
  const baseTypeNavigation = useMemo<TypeNavigation>(
    () => ({
      fromTypeName: typeInfoName,
      fromTypePrimaryFieldValue: `${primaryKeyValue}`,
      fromTypeFieldName: "",
      mode,
      operation,
    }),
    [typeInfoName, primaryKeyValue, mode, operation],
  );
  const baseTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[typeInfoName],
    [typeInfoMap, typeInfoName],
  );
  const [navHistory, setNavHistory] = useState<TypeNavigation[]>([]);
  const relationshipMode = navHistory.length > 0;
  const currentTypeNavigation = useMemo<TypeNavigation>(
    () => navHistory[navHistory.length - 1] || baseTypeNavigation,
    [navHistory, baseTypeNavigation],
  );
  const {
    fromTypeName: currentFromTypeName,
    fromTypePrimaryFieldValue: currentFromTypePrimaryFieldValue,
    fromTypeFieldName: currentFromTypeFieldName,
    operation: currentOperation,
  } = currentTypeNavigation;
  const currentFromTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[currentFromTypeName],
    [typeInfoMap, currentFromTypeName],
  );
  const toTypeInfoName = useMemo<string>(() => {
    let typeName = typeInfoName;

    if (relationshipMode) {
      const {
        fields: {
          [currentFromTypeFieldName]: { typeReference = undefined } = {},
        } = {},
      } = currentFromTypeInfo;

      if (typeof typeReference === "string") {
        typeName = typeReference;
      }
    }

    return typeName;
  }, [
    typeInfoName,
    relationshipMode,
    currentFromTypeFieldName,
    currentFromTypeInfo,
  ]);
  const toTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[toTypeInfoName],
    [typeInfoMap, toTypeInfoName, baseTypeInfo],
  );
  const currentTypeDataStateMap = useMemo<TypeDataStateMap>(
    () => value[toTypeInfoName],
    [value, toTypeInfoName],
  );
  const currentTypeInfoDataMap = useMemo<TypeInfoDataMap>(
    () => currentTypeDataStateMap[currentOperation],
    [currentTypeDataStateMap, currentOperation],
  );
  const currentDataItem = useMemo<TypeInfoDataItem>(
    () => currentTypeInfoDataMap[currentFromTypePrimaryFieldValue],
    [currentTypeInfoDataMap, currentFromTypePrimaryFieldValue],
  );
  const onNavigateToType = useCallback(
    (typeNavigation: TypeNavigation) => {
      if (isValidTypeNavigation(typeNavigation, typeInfoMap)) {
        setNavHistory((prevNavHistory) => [...prevNavHistory, typeNavigation]);
      }
    },
    [typeInfoMap, typeInfoMap],
  );
  const onCloseCurrentNavHistoryItem = useCallback(() => {
    setNavHistory((prevNavHistory) => {
      if (prevNavHistory.length > 0) {
        const [_currentNavHistoryItem, ...restNavHistory] = [
          ...prevNavHistory,
        ].reverse();

        return restNavHistory.reverse();
      } else {
        return prevNavHistory;
      }
    });
  }, []);
  const onCurrentDataItemChange = useCallback(
    (newDataItem: TypeInfoDataItem) => {
      onChange({
        ...value,
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
      value,
      currentFromTypeName,
      currentTypeDataStateMap,
      currentOperation,
      currentTypeInfoDataMap,
      currentFromTypePrimaryFieldValue,
      onChange,
    ],
  );

  return (
    <TypeInfoForm
      typeInfoName={toTypeInfoName}
      typeInfo={toTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      operation={operation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  );
};
