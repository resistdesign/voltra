import { useMemo } from "react";
import { TypeNavigationMode } from "../Types";
import { TypeInfoORMServiceError } from "../../../../common/TypeInfoORM";
import { TypeInfoDataItem } from "../../../../common/TypeParsing/TypeInfo";
import { ListItemsResults } from "../../../../common/SearchTypes";
import { TypeInfoORMAPIState } from "../../../utils/TypeInfoORMAPIUtils";

export type TypeInfoApplicationState = {
  [TypeNavigationMode.FORM]: {
    loading?: boolean;
    item?: TypeInfoDataItem;
    error?: TypeInfoORMServiceError;
  };
  [TypeNavigationMode.SEARCH_ITEMS]: {
    loading?: boolean;
    listItemsResults?: ListItemsResults<TypeInfoDataItem>;
    error?: TypeInfoORMServiceError;
  };
  [TypeNavigationMode.RELATED_ITEMS]: {
    loading?: boolean;
    listItemsResults?: ListItemsResults<TypeInfoDataItem>;
    error?: TypeInfoORMServiceError;
  };
};

export const useTypeInfoApplicationState = (
  typeInfoORMAPIState: TypeInfoORMAPIState,
): TypeInfoApplicationState => {
  const TypeInfoApplicationState = useMemo<TypeInfoApplicationState>(() => {
    const {
      create,
      read,
      update,
      delete: deleteState,
      list,
      createRelationship,
      deleteRelationship,
      listRelatedItems,
    } = typeInfoORMAPIState;

    return {
      [TypeNavigationMode.FORM]: {
        loading: create?.loading || read?.loading || update?.loading,
        item: read?.data as TypeInfoDataItem,
        error: create?.error ?? read?.error ?? update?.error,
      },
      [TypeNavigationMode.SEARCH_ITEMS]: {
        loading: list?.loading || deleteState?.loading,
        listItemsResults: list?.data as ListItemsResults<TypeInfoDataItem>,
        error: list?.error ?? deleteState?.error,
      },
      [TypeNavigationMode.RELATED_ITEMS]: {
        loading:
          listRelatedItems?.loading ||
          createRelationship?.loading ||
          deleteRelationship?.loading,
        listItemsResults:
          listRelatedItems?.data as ListItemsResults<TypeInfoDataItem>,
        error:
          listRelatedItems?.error ??
          createRelationship?.error ??
          deleteRelationship?.error,
      },
    };
  }, [typeInfoORMAPIState]);

  return TypeInfoApplicationState;
};
