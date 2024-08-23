import { FC } from "react";
import { TypeInfoForm } from "./TypeInfoForm";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  InputComponent,
  ItemRelationshipInfoStructure,
  TypeInfoDataStructure,
} from "./Types";

export type OperationMode = Exclude<TypeOperation, TypeOperation.DELETE>;
export type UpdateOperationMode = TypeOperation.UPDATE;
export type NonUpdateOperationMode = Exclude<
  OperationMode,
  UpdateOperationMode
>;

export enum TypeInfoApplicationMode {
  LIST = "LIST",
  FORM = "FORM",
}

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
  mode: TypeInfoApplicationMode;
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
  mode = TypeInfoApplicationMode.FORM,
  operation = TypeOperation.CREATE,
  primaryKeyValue,
}) => {
  // TODO: Show a list or a form???
  //   - Are we (based on denied operations???):
  //     - Creating a new object and adding a relationship for it.
  //     - Updating an existing object.
  //     - Selecting/Removing an existing object or objects.
  // TODO: Is the top of the application a form or a list, or can it be both???
  // TODO: Show object search/list controls when there is a TypeNavigation in the history.
  //   - Use the relationship info to get the related items.
  //     - How to READ the related items?

  return currentTypeInfo ? (
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
  ) : undefined;
};
