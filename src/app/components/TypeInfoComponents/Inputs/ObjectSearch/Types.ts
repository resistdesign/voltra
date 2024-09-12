import { StandardExpandedPagingCursor } from "../../../../../common/SearchTypes";

export type PagingControlsConfig = {
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  pagingCursor: StandardExpandedPagingCursor | undefined;
  onFirst: () => void;
  onPrevious: () => void;
  onPageNumber: (pageNumber: number) => void;
  onNext: () => void;
  onLast: () => void;
};
