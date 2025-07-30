import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ListItemsConfig,
  PagingInfo,
  StandardExpandedPagingCursor,
} from "../../../../../common/SearchTypes";
import styled from "styled-components";
import { ValueButton } from "../../../Basic/ValueButton";
import { MaterialSymbol } from "../../../MaterialSymbol";

export const getStandardExpandedPagingCursor = (
  cursor?: string,
): StandardExpandedPagingCursor => {
  try {
    const { currentPage = 1, totalPages = 1 }: StandardExpandedPagingCursor =
      JSON.parse(cursor as string) as StandardExpandedPagingCursor;

    return {
      currentPage,
      totalPages,
    };
  } catch (error) {
    return {
      currentPage: 1,
      totalPages: 1,
    };
  }
};

export type CursorCacheController = {
  cursorCache: string[];
  currentCursor: string | undefined;
  nextCursor: string | undefined;
  atFirstCursor: boolean;
  atLastCursor: boolean;
  onFirstCursor: () => void;
  onPreviousCursor: () => void;
  onSpecifyCursorIndex: (index: number) => void;
  onNextCursor: () => void;
  onLastCursor: () => void;
  onReset: () => void;
};

export const useCursorCacheController = (
  nextCursor: string | undefined,
): CursorCacheController => {
  const [cursorCache, setCursorCache] = useState<string[]>([]);
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const currentCursor = useMemo<string | undefined>(() => {
    return cursorCache[cursorIndex];
  }, [cursorCache, cursorIndex]);
  const atFirstCursor = useMemo(() => {
    return cursorIndex === 0;
  }, [cursorIndex]);
  const atLastCursor = useMemo(() => {
    return cursorIndex === cursorCache.length - 1;
  }, [cursorIndex, cursorCache]);

  // Internal
  const addCursor = useCallback((newCursor: string) => {
    setCursorCache((prevCache) => [...prevCache, newCursor]);
  }, []);
  const onIncrementCursor = useCallback(() => {
    setCursorIndex((prevIndex) => prevIndex + 1);
  }, [cursorCache]);

  // API
  const onFirstCursor = useCallback(() => {
    setCursorIndex(0);
  }, []);
  const onPreviousCursor = useCallback(() => {
    setCursorIndex((prevIndex) => Math.max(0, prevIndex - 1));
  }, []);
  const onSpecifyCursorIndex = useCallback(
    (index: number) => {
      if (index > -1 && index < cursorCache.length) {
        setCursorIndex(index);
      }
    },
    [cursorCache],
  );
  const onNextCursor = useCallback(() => {
    if (!atLastCursor) {
      onIncrementCursor();
    }
  }, [atLastCursor, onIncrementCursor]);
  const onLastCursor = useCallback(() => {
    setCursorIndex(cursorCache.length - 1);
  }, [cursorCache]);
  const onReset = useCallback(() => {
    setCursorCache([]);
    setCursorIndex(0);
  }, []);

  // Effects
  useEffect(() => {
    if (nextCursor !== undefined && !cursorCache.includes(nextCursor)) {
      addCursor(nextCursor);
      onIncrementCursor();
    }
  }, [nextCursor, cursorCache, addCursor, onIncrementCursor]);

  return {
    cursorCache,
    currentCursor,
    nextCursor,
    atFirstCursor,
    atLastCursor,
    onFirstCursor,
    onPreviousCursor,
    onSpecifyCursorIndex,
    onNextCursor,
    onLastCursor,
    onReset,
  };
};

const BasePagingControls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 1em;
`;

export type PagingControlsProps = (
  | {
      fullPaging: true;
      cursorCacheController?: CursorCacheController;
    }
  | {
      fullPaging: false;
      cursorCacheController: CursorCacheController;
    }
) & {
  pagingInfo: PagingInfo;
  listItemsConfig: ListItemsConfig;
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void;
};

export const PagingControls: FC<PagingControlsProps> = ({
  fullPaging,
  cursorCacheController,
  pagingInfo,
  listItemsConfig,
  onListItemsConfigChange,
}) => {
  const {
    cursorCache,
    nextCursor,
    atFirstCursor,
    atLastCursor,
    onFirstCursor,
    onPreviousCursor,
    onSpecifyCursorIndex,
    onNextCursor,
    onLastCursor,
    onReset: onResetCursorCache,
  }: Partial<CursorCacheController> = cursorCacheController || {};
  const { cursor, itemsPerPage = 1 } = pagingInfo;
  const pagingCursor = useMemo<StandardExpandedPagingCursor>(() => {
    return getStandardExpandedPagingCursor(cursor);
  }, [cursor]);
  const { currentPage = 1, totalPages = 1 }: StandardExpandedPagingCursor =
    pagingCursor;

  const hasPrevious = fullPaging ? currentPage > 1 : !atFirstCursor;
  const hasNext = fullPaging ? currentPage < totalPages : !atLastCursor;
  const onPagingInfoChange = useCallback(
    (pagingInfo: PagingInfo) => {
      onListItemsConfigChange({
        ...listItemsConfig,
        ...pagingInfo,
      });
    },
    [listItemsConfig, onListItemsConfigChange],
  );
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
  const onPatchStringCursor = useCallback(
    (newCursor: string) => {
      onPatchPagingInfo({
        cursor: newCursor,
      });
    },
    [onPatchPagingInfo],
  );
  const onPatchCursor = useCallback(
    (newCursor: Partial<StandardExpandedPagingCursor>) => {
      try {
        onPatchStringCursor(
          JSON.stringify({
            ...pagingCursor,
            ...newCursor,
          }),
        );
      } catch (error) {
        // Ignore.
      }
    },
    [pagingCursor, onPatchStringCursor],
  );
  const onItemsPerPageChange = useCallback(
    (itemsPerPage: number) => {
      onResetCursorCache?.();
      onPatchPagingInfo({
        cursor: undefined,
        itemsPerPage,
      });
    },
    [onPatchPagingInfo, onResetCursorCache],
  );
  const onFirst = useCallback(() => {
    if (fullPaging) {
      onPatchCursor({
        currentPage: 1,
      });
    } else {
      onFirstCursor?.();
    }
  }, [fullPaging, onPatchCursor, onFirstCursor]);
  const onPrevious = useCallback(() => {
    if (fullPaging) {
      onPatchCursor({
        currentPage: Math.max(1, currentPage - 1),
      });
    } else {
      onPreviousCursor?.();
    }
  }, [fullPaging, currentPage, onPatchCursor, onPreviousCursor]);
  const onPageNumber = useCallback(
    (pageNumber: number) => {
      if (fullPaging) {
        onPatchCursor({
          currentPage: pageNumber,
        });
      } else {
        onSpecifyCursorIndex?.(pageNumber - 1);
      }
    },
    [fullPaging, onPatchCursor, onSpecifyCursorIndex],
  );
  const onNext = useCallback(() => {
    if (fullPaging) {
      onPatchCursor({
        currentPage: Math.min(totalPages, currentPage + 1),
      });
    } else {
      onNextCursor?.();

      if (nextCursor) {
        onPatchStringCursor(nextCursor);
      }
    }
  }, [
    fullPaging,
    currentPage,
    onPatchCursor,
    totalPages,
    onNextCursor,
    nextCursor,
    onPatchStringCursor,
  ]);
  const onLast = useCallback(() => {
    if (fullPaging) {
      onPatchCursor({
        currentPage: totalPages,
      });
    } else {
      onLastCursor?.();
    }
  }, [fullPaging, onPatchCursor, totalPages, onLastCursor]);
  const currentPageNumberList = useMemo(() => {
    const pageNumberList = [];

    if (fullPaging) {
      for (let i = currentPage - 3; i <= totalPages; i++) {
        const thisPageNumber = i;

        if (thisPageNumber > 0) {
          pageNumberList.push(thisPageNumber);
        }

        if (thisPageNumber === currentPage + 3) {
          break;
        }
      }
    } else if (cursorCache) {
      for (let i = 0; i < cursorCache.length; i++) {
        pageNumberList.push(i + 1);
      }
    }

    return pageNumberList;
  }, [fullPaging, cursorCache, currentPage, totalPages]);
  const onItemsPerPageChangeInternal = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const itemsPerPage = parseInt(event.target.value, 10);

      onItemsPerPageChange(itemsPerPage);
    },
    [onItemsPerPageChange],
  );

  return (
    <BasePagingControls>
      {hasPrevious ? (
        <>
          <button onClick={onFirst}>
            <MaterialSymbol>skip_previous</MaterialSymbol>
          </button>
          <button onClick={onPrevious}>
            <MaterialSymbol>fast_rewind</MaterialSymbol>
          </button>
        </>
      ) : undefined}
      {currentPageNumberList.map((pageNumber) => (
        <ValueButton
          key={`Page:${pageNumber}`}
          value={pageNumber}
          onClick={onPageNumber}
        >
          {pageNumber === currentPage ? (
            <strong>{pageNumber}</strong>
          ) : (
            pageNumber
          )}
        </ValueButton>
      ))}
      {hasNext || !fullPaging ? (
        <button onClick={onNext}>
          <MaterialSymbol>fast_forward</MaterialSymbol>
        </button>
      ) : undefined}
      {(fullPaging && hasNext) || (!fullPaging && !atLastCursor) ? (
        <button onClick={onLast}>
          <MaterialSymbol>skip_next</MaterialSymbol>
        </button>
      ) : undefined}
      <select value={`${itemsPerPage}`} onChange={onItemsPerPageChangeInternal}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </BasePagingControls>
  );
};
