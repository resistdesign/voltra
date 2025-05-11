import { FC } from "react";
import styled from "styled-components";
import { TypeInfoDataItem, TypeOperation } from "../../../../common/TypeParsing/TypeInfo";
import { TypeNavigation } from "../Types";
import { ItemViewOperation } from "./TypeNavUtils";
import { ListItemsResults, PagingInfo } from "../../../../common/SearchTypes";
import { usePagingControls } from "./ObjectSearch/usePagingControls";
import { PagingControls } from "./ObjectSearch/PagingControls";

const BaseRelatedItemList = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;
const Controls = styled.div`
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1em;
`;

export type RelatedItemListProps = {
  operation: ItemViewOperation;
  typeNavigation: TypeNavigation;
  relatedItemsResults: ListItemsResults<TypeInfoDataItem>;
  pagingInfo: PagingInfo;
  onPagingInfoChange: (pagingInfo: PagingInfo) => void;
  onRemoveRelatedItem?: (primaryFieldValue: any) => void;
  onNewRelatedItem?: () => void;
  onSelectRelatedItem?: () => void;
  onClose?: () => void;
};

export const RelatedItemList: FC<RelatedItemListProps> = ({
                                                            operation = TypeOperation.READ,
                                                            typeNavigation,
                                                            relatedItemsResults,
                                                            pagingInfo,
                                                            onPagingInfoChange
                                                          }) => {
  const pagingControls = usePagingControls(pagingInfo, onPagingInfoChange);

  return (
    <BaseRelatedItemList>
      {/*<ObjectTable*/}
      {/*  typeInfoMap={typeInfoMap}*/}
      {/*  typeInfoName={typeInfoName}*/}
      {/*  typeInfo={typeInfo}*/}
      {/*  sortFields={sortFields}*/}
      {/*  onSortFieldsChange={onSortFieldsChange}*/}
      {/*  objectList={itemResults}*/}
      {/*  selectable={selectable}*/}
      {/*  selectedIndices={selectedIndices}*/}
      {/*  onSelectedIndicesChange={onSelectedIndicesChange}*/}
      {/*  onNavigateToType={onNavigateToType}*/}
      {/*/>*/}
      <Controls>
        <PagingControls {...pagingControls} />
      </Controls>
    </BaseRelatedItemList>
  );
};
