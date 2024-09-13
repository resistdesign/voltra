import { FC, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
  TypeOperation,
} from "../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation, TypeNavigationMode } from "../Types";
import { transformValueToString } from "../../../../common/StringTransformers";
import { ItemButton } from "../../Basic/ItemButton";
import { MaterialSymbol } from "../../MaterialSymbol";

export type ObjectTableProps = {
  typeInfoName: string;
  typeInfo: TypeInfo;
  objectList: object[];
  selectable?: boolean;
  selectedIndices?: number[];
  onSelectedIndicesChange?: (selectedIndices: number[]) => void;
  operation?: TypeOperation;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const ObjectTable: FC<ObjectTableProps> = ({
  typeInfoName,
  typeInfo,
  objectList = [],
  selectable = false,
  selectedIndices = [],
  onSelectedIndicesChange,
  operation = TypeOperation.READ,
  onNavigateToType,
}) => {
  const { primaryField } = typeInfo;
  const typeInfoFields = useMemo<Record<string, TypeInfoField>>(() => {
    const { fields: tIF = {} } = typeInfo;

    return tIF;
  }, [typeInfo]);
  const fieldNames = useMemo<string[]>(
    () => Object.keys(typeInfoFields),
    [typeInfoFields],
  );
  const fieldHeaderLabels = useMemo<string[]>(
    () =>
      fieldNames
        .map((f) => {
          const { tags = {} } = typeInfoFields[f];
          const { label = f, hidden } = tags as SupportedFieldTags;

          return hidden ? undefined : label;
        })
        .filter((f) => f !== undefined) as string[],
    [fieldNames, typeInfoFields],
  );
  const typeNavigationMap = useMemo<
    Record<number, Record<string, TypeNavigation>>
  >(() => {
    const tNM: Record<string, Record<string, TypeNavigation>> = {};

    for (let i = 0; i < objectList.length; i++) {
      const item = objectList[i];
      const fromTypePrimaryFieldValue =
        typeof item === "object" && item !== null
          ? item[primaryField as keyof object]
          : undefined;

      if (typeof fromTypePrimaryFieldValue !== "undefined") {
        for (const fN of fieldNames) {
          const { typeReference } = typeInfoFields[fN];

          if (typeReference) {
            const newTypeNavigation: TypeNavigation = {
              fromTypeName: typeInfoName,
              fromTypePrimaryFieldValue,
              fromTypeFieldName: fN,
              mode: TypeNavigationMode.FORM,
              operation,
            };

            tNM[i][fN] = newTypeNavigation;
          }
        }
      }
    }

    return tNM;
  }, [
    objectList,
    primaryField,
    typeInfoName,
    fieldNames,
    typeInfoFields,
    operation,
  ]);
  const allIndicesAreSelected = useMemo<boolean>(
    () => objectList.every((_, index) => selectedIndices.includes(index)),
    [selectedIndices, objectList],
  );
  const indicesArePartiallySelected = useMemo<boolean>(
    () =>
      objectList.some((_, index) => selectedIndices.includes(index)) &&
      !allIndicesAreSelected,
    [selectedIndices, objectList, allIndicesAreSelected],
  );

  return (
    <table>
      <thead>
        <tr>
          {selectable ? (
            <th>
              <input
                type="checkbox"
                checked={allIndicesAreSelected}
              />
            </th>
          ) : // TODO: Partially selected checkbox.
          undefined}
          {fieldHeaderLabels.map((fieldLabel, index) => (
            <th key={`FieldLabel:${fieldLabel}:${index}`}>{fieldLabel}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {objectList.map((item = {}, index) => {
          // TODO: How to show that a row/item is selected?
          return (
            <tr key={index}>
              <td>
                <input type="checkbox" checked />
              </td>
              {fieldNames.map((fieldName, fieldIndex) => {
                const {
                  type,
                  typeReference,
                  tags = {},
                  array: fieldIsArray,
                } = typeInfoFields[fieldName];
                const {
                  hidden,
                  customType,
                  deniedOperations = {},
                } = tags as SupportedFieldTags;
                const { READ: readDenied = false } = deniedOperations;
                const fieldValue = item[fieldName as keyof typeof item];

                let content = undefined;

                if (!readDenied) {
                  if (typeReference) {
                    const typeNavigation: TypeNavigation =
                      typeNavigationMap[index][fieldName];
                    const hasValue =
                      (fieldIsArray &&
                        Array.isArray(fieldValue) &&
                        (fieldValue as any[]).length > 0) ||
                      (!fieldIsArray &&
                        typeof fieldValue !== "undefined" &&
                        fieldValue !== null);

                    return typeNavigation ? (
                      <td key={`Field:${fieldName}:${fieldIndex}`}>
                        <ItemButton
                          item={typeNavigation}
                          onClick={onNavigateToType}
                        >
                          <MaterialSymbol>
                            {operation === TypeOperation.READ
                              ? "manage_search"
                              : hasValue
                                ? "edit_square"
                                : "add"}
                          </MaterialSymbol>
                        </ItemButton>
                      </td>
                    ) : undefined;
                  } else if (!hidden) {
                    content = transformValueToString(
                      fieldValue,
                      type,
                      customType,
                    );
                  }
                }

                return (
                  <td key={`Field:${fieldName}:${fieldIndex}`}>{content}</td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
