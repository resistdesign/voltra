import { PagingControlsConfig } from "./Types";
import { PagingInfo } from "../../../../../common";
import { useCallback, useMemo } from "react";
import { StandardExpandedPagingCursor } from "../../../../../common/SearchTypes";

export const getStandardExpandedPagingCursor = (
  cursor?: string,
): StandardExpandedPagingCursor | undefined => {
  try {
    const { currentPage = 1, totalPages = 1 }: StandardExpandedPagingCursor =
      JSON.parse(cursor as string) as StandardExpandedPagingCursor;

    return {
      currentPage,
      totalPages,
    };
  } catch (error) {
    return undefined;
  }
};

export const usePagingControls = (
  pagingInfo: PagingInfo,
  onPagingInfoChange?: (pagingInfo: PagingInfo) => void,
): PagingControlsConfig => {
  const { cursor, itemsPerPage = 1 } = pagingInfo;
  const fullCursor = useMemo<StandardExpandedPagingCursor | undefined>(() => {
    return getStandardExpandedPagingCursor(cursor);
  }, [cursor]);
  const {
    currentPage = 1,
    totalPages = 1,
  }: Partial<StandardExpandedPagingCursor> = fullCursor || {};
  const onPatchPagingInfo = useCallback(
    (newPagingInfo: Partial<PagingInfo>) => {
      if (onPagingInfoChange) {
        onPagingInfoChange({
          ...pagingInfo,
          ...newPagingInfo,
        });
      }
    },
    [onPagingInfoChange, pagingInfo],
  );
  const onPatchCursor = useCallback(
    (newCursor: Partial<StandardExpandedPagingCursor>) => {
      try {
        onPatchPagingInfo({
          cursor: JSON.stringify({
            ...fullCursor,
            ...newCursor,
          }),
        });
      } catch (error) {
        // Ignore.
      }
    },
    [fullCursor, onPatchPagingInfo],
  );
  const onItemsPerPageChange = useCallback(
    (itemsPerPage: number) => {
      onPatchPagingInfo({
        itemsPerPage,
      });
    },
    [onPatchPagingInfo],
  );
  const onFirst = useCallback(() => {
    onPatchCursor({
      currentPage: 1,
    });
  }, [onPatchCursor]);
  const onPrevious = useCallback(() => {
    onPatchCursor({
      currentPage: Math.max(1, currentPage - 1),
    });
  }, [currentPage, onPatchCursor]);
  const onPageNumber = useCallback(
    (pageNumber: number) => {
      onPatchCursor({
        currentPage: pageNumber,
      });
    },
    [onPatchCursor],
  );
  const onNext = useCallback(() => {
    onPatchCursor({
      currentPage: Math.min(totalPages, currentPage + 1),
    });
  }, [currentPage, onPatchCursor, totalPages]);
  const onLast = useCallback(() => {
    onPatchCursor({
      currentPage: totalPages,
    });
  }, [onPatchCursor, totalPages]);

  return {
    onItemsPerPageChange,
    pagingCursor: fullCursor,
    onFirst,
    onPrevious,
    onPageNumber,
    onNext,
    onLast,
  };
};
