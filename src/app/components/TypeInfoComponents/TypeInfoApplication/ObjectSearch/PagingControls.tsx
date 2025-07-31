import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

const DEFAULT_CURSOR_CACHE: (string | undefined)[] = [
  // IMPORTANT: The first index of the cache must always be `undefined`.
  // This is because the first page does not have a cursor and
  // the cursor that comes back with the request for the first
  // page is for the second page and so on.
  undefined,
];

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

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const getItemsPerPageOption = (
  itemsPerPageAmount: number,
  fullPaging: boolean,
) => (
  <option value={itemsPerPageAmount}>
    {!fullPaging ? "~ " : undefined}
    {itemsPerPageAmount} / page
  </option>
);

export type CursorCacheController = {
  cursorCache: (string | undefined)[];
  currentCursorIndex: number;
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
  // Data
  const [cursorCache, setCursorCache] =
    useState<(string | undefined)[]>(DEFAULT_CURSOR_CACHE);
  const [currentCursorIndex, setCurrentCursorIndex] = useState<number>(0);
  const currentCursor = useMemo<string | undefined>(() => {
    return cursorCache[currentCursorIndex];
  }, [cursorCache, currentCursorIndex]);
  const atFirstCursor = useMemo(() => {
    return currentCursorIndex === 0;
  }, [currentCursorIndex]);
  const atLastCursor = useMemo(() => {
    return currentCursorIndex === cursorCache.length - 1;
  }, [currentCursorIndex, cursorCache]);

  // Internal
  const addCursor = useCallback((newCursor: string) => {
    setCursorCache((prevCache) => [...prevCache, newCursor]);
  }, []);

  // API
  const onFirstCursor = useCallback(() => {
    setCurrentCursorIndex(0);
  }, []);
  const onPreviousCursor = useCallback(() => {
    setCurrentCursorIndex((prevIndex) => Math.max(0, prevIndex - 1));
  }, []);
  const onSpecifyCursorIndex = useCallback(
    (index: number) => {
      if (index > -1 && index < cursorCache.length) {
        setCurrentCursorIndex(index);
      }
    },
    [cursorCache],
  );
  const onNextCursor = useCallback(() => {
    if (!atLastCursor) {
      setCurrentCursorIndex((prevIndex) => prevIndex + 1);
    }
  }, [atLastCursor]);
  const onLastCursor = useCallback(() => {
    setCurrentCursorIndex(cursorCache.length - 1);
  }, [cursorCache]);
  const onReset = useCallback(() => {
    setCursorCache(DEFAULT_CURSOR_CACHE);
    setCurrentCursorIndex(0);
  }, []);

  // Effects
  useEffect(() => {
    if (nextCursor !== undefined && !cursorCache.includes(nextCursor)) {
      addCursor(nextCursor);
    }
  }, [nextCursor, cursorCache, addCursor]);

  return {
    cursorCache,
    currentCursorIndex,
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
  justify-content: stretch;
  align-items: center;
  gap: 1em;
  flex-wrap: wrap;

  & > * {
    flex: 1 0 auto;
    width: unset;
  }

  & > select {
    flex: 100 0 auto;
  }
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
    currentCursorIndex = 0,
    currentCursor,
    atFirstCursor,
    atLastCursor,
    onFirstCursor,
    onPreviousCursor,
    onSpecifyCursorIndex,
    onNextCursor,
    onLastCursor,
    onReset: onResetCursorCache,
  }: Partial<CursorCacheController> = cursorCacheController || {};
  const lastCursorRef = useRef<string | undefined>(undefined);
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
    (newCursor: string | undefined) => {
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
    }
  }, [fullPaging, currentPage, onPatchCursor, totalPages, onNextCursor]);
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
    const cP = fullPaging ? currentPage : currentCursorIndex + 1;
    const tP = fullPaging ? totalPages : (cursorCache?.length ?? 0);
    const rangeSize = 5; // Number of pages to show in the range.
    const rangeSizeOffset = Math.floor(rangeSize / 2);
    const anchorPage = Math.min(
      tP - rangeSizeOffset,
      Math.max(1 + rangeSizeOffset, cP),
    );
    const rangeStart = Math.max(1, anchorPage - rangeSizeOffset);
    const rangeEnd = Math.min(tP, anchorPage + rangeSizeOffset);

    // IMPORTANT: Limit the number of pages.
    for (let i = rangeStart; i <= rangeEnd; i++) {
      const thisPageNumber = i;

      if (thisPageNumber > 0) {
        pageNumberList.push(thisPageNumber);
      }
    }

    return pageNumberList;
  }, [fullPaging, cursorCache, currentCursorIndex, currentPage, totalPages]);
  const selectedPageNumber = useMemo<number>(
    () => (fullPaging ? currentPage : currentCursorIndex + 1),
    [fullPaging, currentPage, currentCursorIndex],
  );
  const onItemsPerPageChangeInternal = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const itemsPerPage = parseInt(event.target.value, 10);

      onItemsPerPageChange(itemsPerPage);
    },
    [onItemsPerPageChange],
  );

  useEffect(() => {
    if (currentCursor !== lastCursorRef.current) {
      lastCursorRef.current = currentCursor;

      onPatchStringCursor(currentCursor);
    }
  }, [currentCursor, onPatchStringCursor]);

  return (
    <BasePagingControls>
      <button disabled={!hasPrevious} onClick={onFirst}>
        <MaterialSymbol>skip_previous</MaterialSymbol>
      </button>
      <button disabled={!hasPrevious} onClick={onPrevious}>
        <MaterialSymbol>fast_rewind</MaterialSymbol>
      </button>
      {currentPageNumberList.map((pageNumber) => (
        <ValueButton
          key={`Page:${pageNumber}`}
          disabled={pageNumber === selectedPageNumber}
          value={pageNumber}
          onClick={onPageNumber}
        >
          {pageNumber}
        </ValueButton>
      ))}
      <button disabled={!hasNext} onClick={onNext}>
        <MaterialSymbol>fast_forward</MaterialSymbol>
      </button>
      <button disabled={!hasNext} onClick={onLast}>
        <MaterialSymbol>skip_next</MaterialSymbol>
      </button>
      <select value={`${itemsPerPage}`} onChange={onItemsPerPageChangeInternal}>
        {ITEMS_PER_PAGE_OPTIONS.map((itemsPerPageAmount) =>
          getItemsPerPageOption(itemsPerPageAmount, fullPaging),
        )}
      </select>
    </BasePagingControls>
  );
};
