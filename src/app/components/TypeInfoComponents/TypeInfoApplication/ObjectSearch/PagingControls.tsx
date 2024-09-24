import {
  ChangeEvent as ReactChangeEvent,
  FC,
  useCallback,
  useMemo,
} from "react";
import { StandardExpandedPagingCursor } from "../../../../../common/SearchTypes";
import styled from "styled-components";
import { ValueButton } from "../../../Basic/ValueButton";
import { MaterialSymbol } from "../../../MaterialSymbol";
import { PagingControlsConfig } from "./Types";

const BasePagingControls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 1em;
`;

export const PagingControls: FC<PagingControlsConfig> = ({
  itemsPerPage = 10,
  onItemsPerPageChange,
  pagingCursor,
  onFirst,
  onPrevious,
  onPageNumber,
  onNext,
  onLast,
}) => {
  const standardPagingCursor = useMemo<StandardExpandedPagingCursor>(
    () =>
      typeof pagingCursor === "object"
        ? pagingCursor
        : {
            currentPage: 1,
            totalPages: 1,
          },
    [pagingCursor],
  );
  const { currentPage = 1, totalPages = 1 } = standardPagingCursor;
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
    [onItemsPerPageChange],
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
