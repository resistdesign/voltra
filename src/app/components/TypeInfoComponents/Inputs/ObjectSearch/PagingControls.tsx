import { FC, useMemo } from "react";
import { StandardExpandedPagingCursor } from "../../../../../common/SearchTypes";
import styled from "styled-components";
import { ValueButton } from "../../../Basic/ValueButton";

const BasePagingControls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 1em;
`;

export type PagingControlsProps = {
  fullPaging?: boolean;
  pagingCursor?: string;
  onFirst?: () => void;
  onPrevious?: () => void;
  onPageNumber?: (pageNumber: number) => void;
  onNext?: () => void;
  onLast?: () => void;
};

export const PagingControls: FC<PagingControlsProps> = ({
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
  // TODO: Icons?

  return (
    <BasePagingControls>
      <button onClick={onFirst}>{"|<"}</button>
      <button onClick={onPrevious}>{"<"}</button>
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
      <button onClick={onNext}>{">"}</button>
      <button onClick={onLast}>{">|"}</button>
    </BasePagingControls>
  );
};
