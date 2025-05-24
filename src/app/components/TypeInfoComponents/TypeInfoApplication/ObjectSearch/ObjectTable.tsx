import { FC, useEffect, useMemo } from "react";
import {
  TypeInfo,
  TypeInfoDataItem,
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
import {
  sortFieldsAreEqual,
  useSortFieldController,
} from "./ObjectTable/SortFieldUtils";
import { useFieldInfo } from "./ObjectTable/FieldInfoUtils";

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
  sortFields: originalSortFields = [],
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
  const { typeInfoFields, unhiddenFieldNames } = useFieldInfo(typeInfo);
  const { sortFields, sortFieldMap, onToggleSortField } =
    useSortFieldController(originalSortFields);

  useEffect(() => {
    if (
      onSelectedIndicesChange &&
      !selectedIndexArraysAreEqual(originalSelectedIndices, selectedIndices)
    ) {
      onSelectedIndicesChange(selectedIndices);
    }
  }, [originalSelectedIndices, selectedIndices, onSelectedIndicesChange]);

  useEffect(() => {
    if (
      onSortFieldsChange &&
      !sortFieldsAreEqual(originalSortFields, sortFields)
    ) {
      onSortFieldsChange(sortFields);
    }
  }, [originalSortFields, sortFields, onSortFieldsChange]);

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
