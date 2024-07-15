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

/**
 * Create a multi-type driven type information form application.
 * */
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
  const currentPrimaryFieldName = useMemo(() => {
    return currentTypeInfo?.primaryField;
  }, [currentTypeInfo]);
  const currentDataItem = useMemo<TypeInfoDataItem>(() => {
    return (
      value?.[currentTypeName]?.[currentOperation]?.[
        currentPrimaryFieldValue
      ] ?? {}
    );
  }, [currentTypeName, currentOperation, currentPrimaryFieldValue, value]);
  const isFirstHistoryNavItem = useMemo(() => {
    return typeNavigationHistory.length === 1;
  }, [typeNavigationHistory]);
  const onCancelCurrentNavHistory = useCallback(() => {
    setTypeNavigationHistory((prevTypeNavigationHistory) => {
      if (!isFirstHistoryNavItem) {
        const [_currentNav, ...historyNavList] = [
          ...prevTypeNavigationHistory,
        ].reverse();

        return historyNavList.reverse();
      } else {
        return prevTypeNavigationHistory;
      }
    });
  }, [isFirstHistoryNavItem]);
  const onCurrentDataItemChange = useCallback(
    // TODO: *How to return from type navigation and apply the new value to the related field on the correct object.
    (newDataItem: TypeInfoDataItem = {}) => {
      onChange({
        ...value,
        [currentTypeName]: {
          ...value[currentTypeName],
          [currentOperation]: {
            ...value[currentTypeName]?.[currentOperation],
            [currentPrimaryFieldValue]:
              currentOperation === "create" &&
              typeof currentPrimaryFieldName === "string"
                ? {
                    ...newDataItem,
                    [currentPrimaryFieldName]: currentPrimaryFieldValue,
                  }
                : newDataItem,
          },
        },
      });
      onCancelCurrentNavHistory();
    },
    [
      currentTypeName,
      currentOperation,
      currentPrimaryFieldName,
      currentPrimaryFieldValue,
      onChange,
      value,
      onCancelCurrentNavHistory,
    ],
  );

  return currentTypeInfo ? (
    <TypeInfoForm
      typeInfo={currentTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={currentDataItem}
      onCancel={isFirstHistoryNavItem ? undefined : onCancelCurrentNavHistory}
      onSubmit={onCurrentDataItemChange}
      onNavigateToType={onNavigateToType}
    />
  ) : undefined;
};
