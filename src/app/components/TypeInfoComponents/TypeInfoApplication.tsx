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
import {
  NonUpdateOperationMode,
  UpdateOperationMode,
} from "./TypeInfoApplication/Types";
import { useBaseTypeNavigation } from "./TypeInfoApplication/TypeNavUtils";

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
  const baseTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[baseTypeInfoName],
    [typeInfoMap, baseTypeInfoName],
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
    let typeName = baseTypeInfoName;

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
    baseTypeInfoName,
    relationshipMode,
    currentFromTypeFieldName,
    currentFromTypeInfo,
  ]);
  const toTypeInfo = useMemo<TypeInfo>(
    () => typeInfoMap[toTypeInfoName],
    [typeInfoMap, toTypeInfoName, baseTypeInfo],
  );
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
