import { FC, useCallback, useEffect, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoField,
  TypeInfoMap,
} from "../../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation } from "../../Types";
import {
  CheckedState,
  CheckedStateIndeterminate,
  PartiallySelectableCheckbox,
} from "../../../Basic/PartiallySelectableCheckbox";
import { HeaderCell } from "./ObjectTable/HeaderCell";
import { ItemRow } from "./ObjectTable/ItemRow";
import { SortField } from "../../../../../common/SearchTypes";
import {
  selectedIndexArraysAreEqual,
  useIndexSelectionController,
} from "./ObjectTable/SelectionUtils";

export type ObjectTableProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  typeInfo: TypeInfo;
  sortFields?: SortField[];
  onSortFieldsChange?: (sortFields: SortField[]) => void;
  objectList: TypeInfoDataItem[];
  selectable?: boolean;
  selectedIndices?: number[];
  onSelectedIndicesChange?: (selectedIndices: number[]) => void;
  onNavigateToType?: (typeNavigation: TypeNavigation) => void;
};

export const ObjectTable: FC<ObjectTableProps> = ({
  typeInfoMap,
  typeInfoName,
  typeInfo,
  sortFields = [],
  onSortFieldsChange,
  objectList = [],
  selectable = false,
  selectedIndices: originalSelectedIndices = [],
  onSelectedIndicesChange,
  onNavigateToType,
}) => {
  const {
    selectedIndices,
    allIndicesAreSelected,
    someIndicesAreSelected,
    getIndexIsSelected,
    onSetAllIndicesSelected,
    onToggleIndexSelection,
  } = useIndexSelectionController(
    originalSelectedIndices,
    objectList.length - 1,
  );
  const indexSelectionState = useMemo<CheckedState>(() => {
    if (allIndicesAreSelected) {
      return true;
    } else if (someIndicesAreSelected) {
      return CheckedStateIndeterminate;
    }

    return false;
  }, [allIndicesAreSelected, someIndicesAreSelected]);
  // TODO: Sort fields utils.
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

  useEffect(() => {
    if (
      onSelectedIndicesChange &&
      !selectedIndexArraysAreEqual(originalSelectedIndices, selectedIndices)
    ) {
      onSelectedIndicesChange(selectedIndices);
    }
  }, [originalSelectedIndices, selectedIndices, onSelectedIndicesChange]);

  return (
    <table>
      <thead>
        <tr>
          {selectable ? (
            <th>
              <PartiallySelectableCheckbox
                checked={indexSelectionState}
                onChange={onSetAllIndicesSelected}
              />
            </th>
          ) : undefined}
          {unhiddenFieldNames.map((fieldName, index) => (
            <HeaderCell
              key={`FieldLabel:${fieldName}:${index}`}
              sortedState={sortFieldMap[fieldName]}
              fieldName={fieldName}
              typeInfoField={typeInfoFields[fieldName]}
              onClick={onToggleSortField}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {objectList.map((item = {}, index) => {
          return (
            <ItemRow
              key={`ItemRow:${index}`}
              typeInfoMap={typeInfoMap}
              index={index}
              typeInfoName={typeInfoName}
              typeInfo={typeInfo}
              item={item as TypeInfoDataItem}
              onNavigateToType={onNavigateToType}
              selectable={selectable}
              selected={getIndexIsSelected(index)}
              onToggleSelection={onToggleIndexSelection}
            />
          );
        })}
      </tbody>
    </table>
  );
};
