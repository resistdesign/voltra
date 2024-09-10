import { FC, useMemo } from "react";
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
  fullPaging,
  pagingCursor,
  onFirst,
  onPrevious,
  onPageNumber,
  onNext,
  onLast,
}) => {
  const standardPagingCursor = useMemo<StandardExpandedPagingCursor>(() => {
    try {
      return typeof pagingCursor === "string"
        ? (JSON.parse(pagingCursor) as StandardExpandedPagingCursor)
        : {};
    } catch (error) {
      return {};
    }
  }, [pagingCursor]);
  const { currentPage = 1, totalPages = 1 } = standardPagingCursor;
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
    }

    return pageNumberList;
  }, [currentPage, fullPaging, totalPages]);

  return (
    <BasePagingControls>
      <button onClick={onFirst}>
        <MaterialSymbol>skip_previous</MaterialSymbol>
      </button>
      <button onClick={onPrevious}>
        <MaterialSymbol>fast_rewind</MaterialSymbol>
      </button>
      {fullPaging
        ? currentPageNumberList.map((pageNumber) => (
            <ValueButton value={pageNumber} onClick={onPageNumber}>
              {pageNumber === currentPage ? (
                <strong>{pageNumber}</strong>
              ) : (
                pageNumber
              )}
            </ValueButton>
          ))
        : undefined}
      <button onClick={onNext}>
        <MaterialSymbol>fast_forward</MaterialSymbol>
      </button>
      <button onClick={onLast}>
        <MaterialSymbol>skip_next</MaterialSymbol>
      </button>
    </BasePagingControls>
  );
};
