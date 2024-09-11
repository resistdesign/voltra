import { StandardExpandedPagingCursor } from "../../../../../common/SearchTypes";

export type PagingControlsConfig = {
  onItemsPerPageChange: (itemsPerPage: number) => void;
  fullPaging: boolean;
  pagingCursor: StandardExpandedPagingCursor | undefined;
  onFirst: () => void;
  onPrevious: () => void;
  onPageNumber: (pageNumber: number) => void;
  onNext: () => void;
  onLast: () => void;
};
