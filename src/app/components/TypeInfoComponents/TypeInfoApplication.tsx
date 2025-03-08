import { FC } from "react";
import { TypeInfoForm } from "./TypeInfoApplication/TypeInfoForm";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  TypeInfoDataStructure,
  TypeNavigationMode,
} from "./Types";
import {
  NonUpdateOperationMode,
  UpdateOperationMode,
} from "./TypeInfoApplication/Types";
import {
  useBaseTypeNavigation,
  useTypeNavHistory,
} from "./TypeInfoApplication/TypeNavUtils";
import { useTypeInfoState } from "./TypeInfoApplication/TypeInfoStateUtils";
import { useTypeInfoDataStore } from "./TypeInfoApplication/TypeInfoDataUtils";

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
    relationshipMode,
    currentFromTypeName,
    currentFromTypePrimaryFieldValue,
    currentFromTypeFieldName,
    currentOperation,
    onNavigateToType,
    onCloseCurrentNavHistoryItem,
  } = useTypeNavHistory({
    baseTypeNavigation,
    typeInfoMap,
  });
  const { toTypeInfoName, toTypeInfo } = useTypeInfoState({
    typeInfoMap,
    baseTypeInfoName,
    currentFromTypeName,
    relationshipMode,
    currentFromTypeFieldName,
  });
  const {
    currentTypeDataStateMap,
    currentTypeInfoDataMap,
    currentDataItem,
    onCurrentDataItemChange,
  } = useTypeInfoDataStore({
    baseValue,
    toTypeInfoName,
    currentOperation,
    currentFromTypeName,
    currentFromTypePrimaryFieldValue,
    onBaseValueChange,
  });

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
