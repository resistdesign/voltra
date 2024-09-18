import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useMemo,
} from "react";
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
import {
  CheckedState,
  PartiallySelectableCheckbox,
} from "../../Basic/PartiallySelectableCheckbox";
import { IndexInput } from "../../Basic/IndexInput";
import { SortField } from "../../../../common";
import { HeaderCell } from "./ObjectTable/HeaderCell";

export type ObjectTableProps = {
  typeInfoName: string;
  typeInfo: TypeInfo;
  sortFields?: SortField[];
  onSortFieldsChange?: (sortFields: SortField[]) => void;
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
  sortFields = [],
  onSortFieldsChange,
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
  const unhiddenFieldNames = useMemo<string[]>(
    () =>
      fieldNames.filter(
        (fN) => !(typeInfoFields[fN].tags as SupportedFieldTags).hidden,
      ),
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
  const allCheckedState = useMemo<CheckedState>(() => {
    if (allIndicesAreSelected) {
      return true;
    } else if (indicesArePartiallySelected) {
      return "indeterminate";
    } else {
      return false;
    }
  }, [allIndicesAreSelected, indicesArePartiallySelected]);
  const onAllCheckedStateChange = useCallback(
    (newChecked: CheckedState) => {
      if (onSelectedIndicesChange) {
        if (newChecked === true) {
          onSelectedIndicesChange(objectList.map((_, index) => index));
        } else if (newChecked === false) {
          onSelectedIndicesChange([]);
        }
      }
    },
    [onSelectedIndicesChange, objectList],
  );
  const onItemSelectionChange = useCallback(
    (
      { target: { checked } }: ReactChangeEvent<HTMLInputElement>,
      index: number,
    ) => {
      if (onSelectedIndicesChange) {
        const wasChecked = selectedIndices.includes(index);

        if (checked !== wasChecked) {
          const newSelectedIndices = checked
            ? [...selectedIndices, index]
            : selectedIndices.filter((i) => i !== index);

          onSelectedIndicesChange(newSelectedIndices);
        }
      }
    },
    [selectedIndices, onSelectedIndicesChange],
  );
  const onToggleSortField = useCallback(
    (fieldName: string) => {
      if (onSortFieldsChange) {
        const fieldIndex = sortFields.findIndex((sf) => sf.field === fieldName);

        if (fieldIndex === -1) {
          // If there is no sort field, then add one.
          onSortFieldsChange([
            ...sortFields,
            { field: fieldName, reverse: false },
          ]);
        } else if (sortFields[fieldIndex]) {
          const { reverse } = sortFields[fieldIndex];
          const newSortField = {
            field: fieldName,
            reverse,
          };

          if (!reverse) {
            newSortField.reverse = true;

            // If there is a sort field, and it is not reversed, then reverse it.
            onSortFieldsChange(
              sortFields.map((sf) =>
                sf.field === fieldName ? newSortField : sf,
              ),
            );
          } else {
            // If there is a sort field, and it is reversed, then remove it.
            onSortFieldsChange(
              sortFields.filter((sf) => sf.field !== fieldName),
            );
          }
        }
      }
    },
    [sortFields, onSortFieldsChange],
  );
  const sortFieldMap = useMemo<Record<string, boolean | undefined>>(
    () =>
      sortFields.reduce<Record<string, boolean | undefined>>(
        (acc, { field, reverse }) => {
          acc[field as keyof typeof acc] = reverse;

          return acc;
        },
        {},
      ),
    [sortFields],
  );

  return (
    <table>
      <thead>
        <tr>
          {selectable ? (
            <th>
              <PartiallySelectableCheckbox
                checked={allCheckedState}
                onChange={onAllCheckedStateChange}
              />
            </th>
          ) : undefined}
          {unhiddenFieldNames.map((fieldName, index) => (
            <HeaderCell
              key={`FieldLabel:${fieldName}:${index}`}
              sortedState={sortFieldMap[fieldName]}
              fieldName={fieldName}
              typeInfoField={typeInfoFields[fieldName]}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {objectList.map((item = {}, index) => {
          return (
            <tr key={index}>
              <td>
                <IndexInput
                  index={index}
                  type="checkbox"
                  checked={selectedIndices.includes(index)}
                  onChange={onItemSelectionChange}
                />
              </td>
              {fieldNames.map((fieldName, fieldIndex) => {
                // TODO: This all needs to be a component.
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

                    // TODO: Do not allow navigation to types if they are tagged to deny the current operation.
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
