export type PagingControlsConfig = {
  fullPaging?: boolean;
  pagingCursor?: string;
  onFirst?: () => void;
  onPrevious: () => void;
  onPageNumber?: (pageNumber: number) => void;
  onNext: () => void;
  onLast?: () => void;
};
