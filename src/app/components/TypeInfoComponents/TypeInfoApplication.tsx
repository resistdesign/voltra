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
import { getSimpleId } from "../../../common/IdGeneration";

export type OperationMode = Exclude<TypeInfoDataItemOperation, "delete">;
export type UpdateOperationMode = "update";
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

export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  typeInfoName,
  operation = "create",
  primaryKeyValue,
  customInputTypeMap,
  value,
  onChange,
}) => {
  const initialTypeNavigation = useMemo<TypeNavigation>(
    () => ({
      typeName: typeInfoName,
      fieldName: "",
      operation,
      // TODO: Relationships*:
      //   - How to get the real primary field value when creating.
      //   - Where to store it once the real primary field is acquired.
      primaryKeyValue: operation === "create" ? getSimpleId() : primaryKeyValue,
    }),
    [operation, primaryKeyValue, typeInfoName],
  );
  const [typeNavigationHistory, setTypeNavigationHistory] = useState<
    TypeNavigation[]
  >([initialTypeNavigation]);
  const onNavigateToType = useCallback(
    (typeNavigation: TypeNavigation) => {
      const { operation, primaryKeyValue } = typeNavigation;

      if (operation === "create") {
        const newTypeNavigation: TypeNavigation = {
          ...typeNavigation,
          primaryKeyValue: getSimpleId(),
        };

        setTypeNavigationHistory((prevTypeNavigationHistory) => [
          ...prevTypeNavigationHistory,
          newTypeNavigation,
        ]);
      } else if (primaryKeyValue) {
        setTypeNavigationHistory((prevTypeNavigationHistory) => [
          ...prevTypeNavigationHistory,
          typeNavigation,
        ]);
      }
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
