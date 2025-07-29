import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const selectedIndexArraysAreEqual = (
  selectedIndicesA: number[] = [],
  selectedIndicesB: number[] = [],
): boolean =>
  selectedIndicesA.every((index) => selectedIndicesB.includes(index)) &&
  selectedIndicesB.every((index) => selectedIndicesA.includes(index));

export type IndexSelectionController = {
  selectedIndices: number[];
  allIndicesAreSelected: boolean;
  someIndicesAreSelected: boolean;
  getIndexIsSelected: (index: number) => boolean;
  onToggleIndexSelection: (index: number) => void;
  onSelectAllIndices: () => void;
  onSelectNone: () => void;
  onSetAllIndicesSelected: (allSelected: boolean) => void;
  onSelectMultipleIndices: (indices: number[]) => void;
  onDeselectMultipleIndices: (indices: number[]) => void;
};

export const useIndexSelectionController = (
  originalSelectedIndices: number[] = [],
  maximumIndex: number,
): IndexSelectionController => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    originalSelectedIndices,
  );
  const allIndices = useMemo<number[]>(
    () => [...new Array(maximumIndex + 1)].map((_, i) => i),
    [maximumIndex],
  );
  const allIndicesAreSelected = useMemo<boolean>(
    () => allIndices.every((index) => selectedIndices.includes(index)),
    [allIndices, selectedIndices],
  );
  const someIndicesAreSelected = useMemo<boolean>(
    () => selectedIndices.length > 0 && !allIndicesAreSelected,
    [selectedIndices, allIndicesAreSelected],
  );
  const getIndexIsSelected = useCallback(
    (index: number) => selectedIndices.includes(index),
    [selectedIndices],
  );
  const onToggleIndexSelection = useCallback(
    (index: number) => {
      setSelectedIndices((prevSelectedIndices) =>
        allIndices.includes(index)
          ? prevSelectedIndices.includes(index)
            ? prevSelectedIndices.filter((i) => i !== index)
            : [...prevSelectedIndices, index]
          : prevSelectedIndices,
      );
    },
    [allIndices],
  );
  const onSelectAllIndices = useCallback(() => {
    setSelectedIndices([...allIndices]);
  }, [allIndices]);
  const onSelectNone = useCallback(() => {
    setSelectedIndices([]);
  }, []);
  const onSetAllIndicesSelected = useCallback(
    (allSelected: boolean = false) => {
      setSelectedIndices(() => (allSelected ? [...allIndices] : []));
    },
    [allIndices],
  );
  const onSelectMultipleIndices = useCallback(
    (indices: number[]) => {
      setSelectedIndices(() =>
        indices.filter((index) => allIndices.includes(index)),
      );
    },
    [allIndices],
  );
  const onDeselectMultipleIndices = useCallback((indices: number[]) => {
    setSelectedIndices((prevSelectedIndices) =>
      prevSelectedIndices.filter((index) => !indices.includes(index)),
    );
  }, []);
  const originalSelectedIndicesRef = useRef<number[]>(originalSelectedIndices);

  useEffect(() => {
    const oSIChanged: boolean =
      originalSelectedIndicesRef.current !== originalSelectedIndices;

    if (oSIChanged) {
      originalSelectedIndicesRef.current = originalSelectedIndices;

      if (
        !selectedIndexArraysAreEqual(originalSelectedIndices, selectedIndices)
      ) {
        setSelectedIndices(originalSelectedIndices);
      }
    }
  }, [originalSelectedIndices, selectedIndices]);

  return {
    selectedIndices,
    allIndicesAreSelected,
    someIndicesAreSelected,
    getIndexIsSelected,
    onToggleIndexSelection,
    onSelectAllIndices,
    onSelectNone,
    onSetAllIndicesSelected,
    onSelectMultipleIndices,
    onDeselectMultipleIndices,
  };
};
