import { useCallback, useMemo, useState } from "react";

export type IndexSelectionController = {
  selectedIndices: number[];
  onToggleIndexSelection: (index: number) => void;
  onSelectAllIndices: () => void;
  onSelectNone: () => void;
  onSelectMultipleIndices: (indices: number[]) => void;
  onDeselectMultipleIndices: (indices: number[]) => void;
};

export const useIndexSelection = (
  maximumIndex: number,
): IndexSelectionController => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const allIndices = useMemo<number[]>(
    () => new Array(maximumIndex + 1).map((_, i) => i),
    [maximumIndex],
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

  return {
    selectedIndices,
    onToggleIndexSelection,
    onSelectAllIndices,
    onSelectNone,
    onSelectMultipleIndices,
    onDeselectMultipleIndices,
  };
};
