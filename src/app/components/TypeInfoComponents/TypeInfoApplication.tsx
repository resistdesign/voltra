import { FC, useCallback, useMemo } from "react";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
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
import {
  NonUpdateOperationMode,
  UpdateOperationMode,
} from "./TypeInfoApplication/Types";
import {
  useBaseTypeNavigation,
  useTypeNavHistory,
} from "./TypeInfoApplication/TypeNavUtils";
import { useTypeInfoState } from "./TypeInfoStateUtils";

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  baseTypeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  baseValue: TypeInfoDataStructure;
  onBaseValueChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
  baseMode: TypeNavigationMode;
} & (
  | {
      baseOperation?: NonUpdateOperationMode;
      basePrimaryKeyValue?: string;
    }
  | {
      baseOperation: UpdateOperationMode;
      basePrimaryKeyValue: string;
    }
);

/**
 * Create a multi-type driven type information form application.
 * */
export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  baseTypeInfoName,
  customInputTypeMap,
  baseValue,
  onBaseValueChange,
  baseMode = TypeNavigationMode.FORM,
  baseOperation = TypeOperation.CREATE,
  basePrimaryKeyValue,
}) => {
  // TODO: Make hooks for all of these constants.
  //   - Break down into logical groups for hooks:
  //     - Type Navigation (w/ Utils)
  //     - Current/Selected Type State (Type/Mode/Operation)
  //       - Edit
  //       - List Related Items
  //       - Search for Items
  //     - Type Info Data Store
  //       - Mapped by [Type Name > Operation > Primary Key Value]
  //     - Using Nav History to determine when/if/how to Store/Update/Manage Item Relationships
  //     - Type Info Service Client Map?
  //       - Or we could just maintain the [Type Info Data Store] and allow the implementation to call services???

  const baseTypeNavigation = useBaseTypeNavigation({
    baseTypeInfoName,
    basePrimaryKeyValue,
    baseMode,
    baseOperation,
  });
  const {
    // TODO: Use `navHistory`,
    setNavHistory,
    relationshipMode,
    currentFromTypeName,
    currentFromTypePrimaryFieldValue,
    currentFromTypeFieldName,
    currentOperation,
  } = useTypeNavHistory({
    baseTypeNavigation,
  });
  const { toTypeInfoName, toTypeInfo } = useTypeInfoState({
    typeInfoMap,
    baseTypeInfoName,
    currentFromTypeName,
    relationshipMode,
    currentFromTypeFieldName,
  });
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

  return (
    <TypeInfoForm
      typeInfoName={toTypeInfoName}
      typeInfo={toTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      operation={currentOperation}
      onCancel={onCloseCurrentNavHistoryItem}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  );
};
