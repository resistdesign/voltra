import { FC, useMemo, useState } from "react";
import { TypeInfoForm } from "./TypeInfoForm";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  ItemRelationshipInfoStructure,
  TypeInfoDataStructure,
  TypeNavigation,
  TypeNavigationMode,
} from "./Types";
import { ObjectSearch } from "./Inputs/ObjectSearch";

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
  const [navHistory, setNavHistory] = useState<TypeNavigation[]>([]);
  const currentTypeNavigation = useMemo<TypeNavigation>(
    () => navHistory[navHistory.length - 1] || baseTypeNavigation,
    [navHistory, baseTypeNavigation],
  );

  return mode === TypeNavigationMode.FORM ? (
    <TypeInfoForm
      typeInfoName={typeInfoName /* TODO: Is this right? */}
      typeInfo={currentTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      onCancel={isFirstHistoryNavItem ? undefined : onCancelCurrentNavHistory}
      operation={operation /* TODO: Is this right? */}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  ) : (
    <ObjectSearch
      typeInfoName={}
      typeInfo={}
      searchCriteria={}
      onSearchCriteriaChange={}
      searchResults={}
    />
  );
};
