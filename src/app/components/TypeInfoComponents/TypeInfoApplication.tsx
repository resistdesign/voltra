import { FC, useMemo, useState } from "react";
import { TypeInfoForm } from "./TypeInfoForm";
import { TypeInfoMap } from "../../../common/TypeParsing/TypeInfo";
import {InputComponent, TypeInfoDataItem, TypeInfoDataStructure, TypeNavigation} from "./Types";

export type TypeInfoApplicationProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  customInputTypeMap?: Record<string, InputComponent<any>>;
  value: TypeInfoDataStructure;
  onChange: (typeInfoDataStructure: TypeInfoDataStructure) => void;
};

export const TypeInfoApplication: FC<TypeInfoApplicationProps> = ({
  typeInfoMap,
  typeInfoName,
  customInputTypeMap,
  value,
  onChange,
}) => {
  const [typeNavigationHistory, setTypeNavigationHistory] =
    useState<TypeNavigation[]>([
      {
        typeName: typeInfoName,
        fieldName: "",
      }
    ]);
  const {
    typeName: currentTypeName,
    fieldName: currentFieldName,
    primaryKeyValue: currentPrimaryKeyValue,
  } = useMemo(() => {
    return typeNavigationHistory?.[typeNavigationHistory.length - 1];
  }, [typeNavigationHistory]);
  const currentTypeInfo = useMemo(() => {
    return typeInfoMap[currentTypeName];
  }, [currentTypeName, typeInfoMap]);
  const currentDataItem = useMemo<TypeInfoDataItem>(() => {
    // TODO: HOW TO GET THE CURRENT DATA VALUE??????????????
    //  This is wrong.
    return value[currentTypeName];
  }, [currentTypeName, currentPrimaryKeyValue, value]);

  // TODO: How to navigate to the correct object (by primary key) when navigating to a type.
  // TODO: How to return from type navigation and apply the new value to the related field on the correct object.
  // TODO: What is the UX around Done VS Submit????

  return currentTypeInfo ?
    (<TypeInfoForm
      typeInfo={currentTypeInfo}
      customInputTypeMap={customInputTypeMap}
      value={{} as any}
      onChange={() => {}}
    />) : undefined;
};
