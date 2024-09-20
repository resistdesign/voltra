import { FC, useCallback, useMemo } from "react";
import {
  SupportedFieldTags,
  TypeInfo,
  TypeInfoField,
  TypeInfoMap,
} from "../../../../common/TypeParsing/TypeInfo";
import { TypeInfoDataItem, TypeNavigation } from "../Types";
import {
  CheckedState,
  PartiallySelectableCheckbox,
} from "../../Basic/PartiallySelectableCheckbox";
import { SortField } from "../../../../common";
import { HeaderCell } from "./ObjectTable/HeaderCell";
import { ItemRow } from "./ObjectTable/ItemRow";

export type ObjectTableProps = {
  typeInfoMap: TypeInfoMap;
  typeInfoName: string;
  typeInfo: TypeInfo;
  sortFields?: SortField[];
  onSortFieldsChange?: (sortFields: SortField[]) => void;
  objectList: object[];
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
  selectedIndices = [],
  onSelectedIndicesChange,
  onNavigateToType,
}) => {
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
  const onToggleIndexSelection = useCallback(
    (index: number) => {
      if (onSelectedIndicesChange) {
        const indexIsSelected = selectedIndices.includes(index);

        if (indexIsSelected) {
          onSelectedIndicesChange(selectedIndices.filter((sI) => sI !== index));
        } else {
          onSelectedIndicesChange([...selectedIndices, index]);
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
              selected={selectedIndices.includes(index)}
              onToggleSelection={onToggleIndexSelection}
            />
          );
        })}
      </tbody>
    </table>
  );
};
