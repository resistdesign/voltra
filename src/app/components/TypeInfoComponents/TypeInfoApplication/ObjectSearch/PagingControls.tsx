import { ChangeEvent as ReactChangeEvent, FC, useCallback, useMemo } from "react";
import { ListItemsConfig, PagingInfo, StandardExpandedPagingCursor } from "../../../../../common/SearchTypes";
import styled from "styled-components";
import { ValueButton } from "../../../Basic/ValueButton";
import { MaterialSymbol } from "../../../MaterialSymbol";

export const getStandardExpandedPagingCursor = (
  cursor?: string
): StandardExpandedPagingCursor => {
  try {
    const { currentPage = 1, totalPages = 1 }: StandardExpandedPagingCursor =
      JSON.parse(cursor as string) as StandardExpandedPagingCursor;

    return {
      currentPage,
      totalPages
    };
  } catch (error) {
    return {
      currentPage: 1,
      totalPages: 1
    };
  }
};

const BasePagingControls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 1em;
`;

export type PagingControlsProps = {
  fullPaging: boolean;
  pagingInfo: PagingInfo;
  listItemsConfig: ListItemsConfig;
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void;
};

export const PagingControls: FC<PagingControlsProps> = ({
                                                          // TODO: USE!!!
                                                          fullPaging,
                                                          pagingInfo,
                                                          listItemsConfig,
                                                          onListItemsConfigChange
                                                        }) => {
  const { cursor, itemsPerPage = 1 } = pagingInfo;
  const pagingCursor = useMemo<StandardExpandedPagingCursor>(() => {
    return getStandardExpandedPagingCursor(cursor);
  }, [cursor]);
  const { currentPage = 1, totalPages = 1 }: StandardExpandedPagingCursor =
    pagingCursor;
  const onPagingInfoChange = useCallback(
    (pagingInfo: PagingInfo) => {
      onListItemsConfigChange({
        ...listItemsConfig,
        ...pagingInfo
      });
    },
    [listItemsConfig, onListItemsConfigChange]
  );
  const onPatchPagingInfo = useCallback(
    (newPagingInfo: Partial<PagingInfo>) => {
      if (onPagingInfoChange) {
        onPagingInfoChange({
          ...pagingInfo,
          ...newPagingInfo
        });
      }
    },
    [onPagingInfoChange, pagingInfo]
  );
  const onPatchCursor = useCallback(
    (newCursor: Partial<StandardExpandedPagingCursor>) => {
      try {
        onPatchPagingInfo({
          cursor: JSON.stringify({
            ...pagingCursor,
            ...newCursor
          })
        });
      } catch (error) {
        // Ignore.
      }
    },
    [pagingCursor, onPatchPagingInfo]
  );
  const onItemsPerPageChange = useCallback(
    (itemsPerPage: number) => {
      onPatchPagingInfo({
        itemsPerPage
      });
    },
    [onPatchPagingInfo]
  );
  const onFirst = useCallback(() => {
    onPatchCursor({
      currentPage: 1
    });
  }, [onPatchCursor]);
  const onPrevious = useCallback(() => {
    onPatchCursor({
      currentPage: Math.max(1, currentPage - 1)
    });
  }, [currentPage, onPatchCursor]);
  const onPageNumber = useCallback(
    (pageNumber: number) => {
      onPatchCursor({
        currentPage: pageNumber
      });
    },
    [onPatchCursor]
  );
  const onNext = useCallback(() => {
    onPatchCursor({
      currentPage: Math.min(totalPages, currentPage + 1)
    });
  }, [currentPage, onPatchCursor, totalPages]);
  const onLast = useCallback(() => {
    onPatchCursor({
      currentPage: totalPages
    });
  }, [onPatchCursor, totalPages]);
  const currentPageNumberList = useMemo(() => {
    const pageNumberList = [];

    for (let i = currentPage - 3; i <= totalPages; i++) {
      const thisPageNumber = i;

      if (thisPageNumber > 0) {
        pageNumberList.push(thisPageNumber);
      }

      if (thisPageNumber === currentPage + 3) {
        break;
      }
    }

    return pageNumberList;
  }, [currentPage, totalPages]);
  const onItemsPerPageChangeInternal = useCallback(
    (event: ReactChangeEvent<HTMLSelectElement>) => {
      const itemsPerPage = parseInt(event.target.value, 10);

      onItemsPerPageChange(itemsPerPage);
    },
    [onItemsPerPageChange]
  );

  return (
    <BasePagingControls>
      <button onClick={onFirst}>
        <MaterialSymbol>skip_previous</MaterialSymbol>
      </button>
      <button onClick={onPrevious}>
        <MaterialSymbol>fast_rewind</MaterialSymbol>
      </button>
      {currentPageNumberList.map((pageNumber) => (
        <ValueButton value={pageNumber} onClick={onPageNumber}>
          {pageNumber === currentPage ? (
            <strong>{pageNumber}</strong>
          ) : (
            pageNumber
          )}
        </ValueButton>
      ))}
      <button onClick={onNext}>
        <MaterialSymbol>fast_forward</MaterialSymbol>
      </button>
      <button onClick={onLast}>
        <MaterialSymbol>skip_next</MaterialSymbol>
      </button>
      <select value={`${itemsPerPage}`} onChange={onItemsPerPageChangeInternal}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
    </BasePagingControls>
  );
};
