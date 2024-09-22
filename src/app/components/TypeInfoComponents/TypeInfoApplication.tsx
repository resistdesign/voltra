import { FC, useCallback, useMemo, useState } from "react";
import { TypeInfoForm } from "./TypeInfoForm";
import {
  TypeInfo,
  TypeInfoField,
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
  onChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  relationshipInfo: ItemRelationshipInfoStructure;
  onRelationshipInfoChange: (
    relationshipInfo: ItemRelationshipInfoStructure,
  ) => void;
  mode: TypeNavigationMode;
  // TODO: Rework search.
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
  onChange,
  relationshipInfo,
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
    () =>
      typeof toTypeInfoName === "string"
        ? typeInfoMap[toTypeInfoName]
        : baseTypeInfo,
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
  const editing = useMemo<boolean>(
    () =>
      currentOperation === TypeOperation.CREATE ||
      currentOperation === TypeOperation.UPDATE,
    [currentOperation],
  );
  const selectable = useMemo<boolean>(() => {
    const {
      tags: {
        deniedOperations: {
          [currentOperation]: fromOperationDenied = false,
        } = {},
      } = {},
      fields: { [currentFromTypeFieldName]: fromTypeInfoField = {} } = {},
    } = currentFromTypeInfo;
    const {
      tags: {
        deniedOperations: {
          [currentOperation]: fromFieldOperationDenied = false,
        } = {},
      } = {},
    }: Partial<TypeInfoField> = fromTypeInfoField;

    return editing && !fromOperationDenied && !fromFieldOperationDenied;
  }, []);
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
      typeInfoName={toTypeInfoName}
      typeInfo={toTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      operation={operation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  ) : (
    <ObjectSearch
      typeInfoMap={typeInfoMap}
      typeInfoName={toTypeInfoName}
      typeInfo={toTypeInfo}
      relationshipCheckConfig={}
      onRelationshipCheckConfigChange={}
      relationshipCheckResults={}
      listItemConfig={}
      onListItemConfigChange={}
      listItemResults={}
      onNavigateToType={onNavigateToType}
      customInputTypeMap={}
      selectable={selectable}
    />
  );
};
