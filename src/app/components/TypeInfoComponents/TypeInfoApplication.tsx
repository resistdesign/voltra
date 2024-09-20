import { FC, useCallback, useMemo, useState } from "react";
import { TypeInfoForm } from "./TypeInfoForm";
import {
  TypeInfo,
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  ItemRelationshipInfoStructure,
  TypeDataStateMap,
  TypeInfoDataItem,
  TypeInfoDataMap,
  TypeInfoDataStructure,
  TypeNavigation,
  TypeNavigationMode,
} from "./Types";
import { ObjectSearch } from "./Inputs/ObjectSearch";
import { SearchCriteria } from "../../../common/SearchTypes";
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
  relationshipInfo: ItemRelationshipInfoStructure;
  onChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  onRelationshipInfoChange: (
    relationshipInfo: ItemRelationshipInfoStructure,
  ) => void;
  mode: TypeNavigationMode;
  searchCriteria: SearchCriteria;
  onSearchCriteriaChange: (searchCriteria: SearchCriteria) => void;
  searchResults: TypeInfoDataItem[];
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
  relationshipInfo,
  onChange,
  onRelationshipInfoChange,
  mode = TypeNavigationMode.FORM,
  operation = TypeOperation.CREATE,
  primaryKeyValue,
  searchCriteria,
  onSearchCriteriaChange,
  searchResults,
}) => {
  // TODO: FEATURES:
  //  - Type Navigation
  //  - Object Search
  //  - Object Creation
  //  - Object Deletion
  //    - Delete Relationships???
  //  - Object Relationships (CRUD + LIst/Check)
  //    - Object Selection
  //  - Item/Form Editing
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
    mode: currentMode,
    operation: currentOperation,
  } = currentTypeNavigation;
  const currentFromTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[currentFromTypeName],
    [typeInfoMap, currentFromTypeName],
  );
  const toTypeName = useMemo<string | undefined>(() => {
    const {
      fields: {
        [currentFromTypeFieldName]: { typeReference = undefined } = {},
      } = {},
    } = currentFromTypeInfo;

    return typeReference;
  }, [currentFromTypeInfo, currentFromTypeFieldName]);
  const toTypeInfo = useMemo<TypeInfo>(
    () =>
      typeof toTypeName === "string" ? typeInfoMap[toTypeName] : baseTypeInfo,
    [typeInfoMap, toTypeName, baseTypeInfo],
  );
  const currentTypeDataStateMap = useMemo<TypeDataStateMap>(
    () => value[currentFromTypeName],
    [value, currentFromTypeName],
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

  // TODO: Object selection and saving relationship info.

  return currentMode === TypeNavigationMode.FORM ? (
    <TypeInfoForm
      typeInfoName={currentFromTypeName}
      typeInfo={toTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      onCancel={onCloseCurrentNavHistoryItem}
      operation={currentOperation}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  ) : (
    <ObjectSearch
      typeInfoName={currentFromTypeName}
      typeInfo={toTypeInfo}
      searchCriteria={searchCriteria}
      onSearchCriteriaChange={onSearchCriteriaChange}
      searchResults={searchResults}
      operation={currentOperation}
      onNavigateToType={onNavigateToType}
      customInputTypeMap={customInputTypeMap}
    />
  );
};
