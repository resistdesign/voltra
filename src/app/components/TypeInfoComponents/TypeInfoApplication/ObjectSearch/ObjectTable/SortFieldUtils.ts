import { useCallback, useEffect, useMemo, useState } from "react";
import { SortField } from "../../../../../../common/SearchTypes";

const getSortFieldMap = (sortFields: SortField[]) =>
  sortFields.reduce<Record<string, boolean | undefined>>(
    (acc, { field, reverse }) => {
      acc[field as keyof typeof acc] = reverse;

      return acc;
    },
    {},
  );

export const sortFieldsAreEqual = (
  sortFieldsA: SortField[] = [],
  sortFieldsB: SortField[] = [],
) => {
  const sortFieldMapA = getSortFieldMap(sortFieldsA);
  const sortFieldMapB = getSortFieldMap(sortFieldsB);
  const sortFieldKeysA = Object.keys(sortFieldMapA);
  const sortFieldKeysB = Object.keys(sortFieldMapB);

  return (
    sortFieldKeysA.every((key) => sortFieldMapA[key] === sortFieldMapB[key]) &&
    sortFieldKeysB.every((key) => sortFieldMapA[key] === sortFieldMapB[key])
  );
};

export type SortFieldController = {
  sortFields: SortField[];
  sortFieldMap: Record<string, boolean | undefined>;
  onToggleSortField: (fieldName: string) => void;
};

export const useSortFieldController = (
  originalSortFields: SortField[] = [],
): SortFieldController => {
  const [sortFields, setSortFields] = useState<SortField[]>(originalSortFields);
  const onToggleSortField = useCallback(
    (fieldName: string) => {
      const fieldIndex = sortFields.findIndex((sf) => sf.field === fieldName);

      if (fieldIndex === -1) {
        // If there is no sort field, then add one.
        setSortFields([...sortFields, { field: fieldName, reverse: false }]);
      } else if (sortFields[fieldIndex]) {
        const { reverse } = sortFields[fieldIndex];
        const newSortField = {
          field: fieldName,
          reverse,
        };

        if (!reverse) {
          newSortField.reverse = true;

          // If there is a sort field, and it is not reversed, then reverse it.
          setSortFields(
            sortFields.map((sf) =>
              sf.field === fieldName ? newSortField : sf,
            ),
          );
        } else {
          // If there is a sort field, and it is reversed, then remove it.
          setSortFields(sortFields.filter((sf) => sf.field !== fieldName));
        }
      }
    },
    [sortFields],
  );
  const sortFieldMap = useMemo<Record<string, boolean | undefined>>(
    () => getSortFieldMap(sortFields),
    [sortFields],
  );

  useEffect(() => {
    if (!sortFieldsAreEqual(originalSortFields, sortFields)) {
      setSortFields(originalSortFields);
    }
  }, [originalSortFields, sortFields]);

  return {
    sortFields,
    sortFieldMap,
    onToggleSortField,
  };
};
