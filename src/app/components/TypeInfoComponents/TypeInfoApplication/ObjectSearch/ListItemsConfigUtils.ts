import { ListItemsConfig } from "../../../../../common/SearchTypes";
import { useEffect, useMemo, useRef } from "react";

export const useListItemsConfigCursorReset = (
  listItemsConfig: ListItemsConfig,
  onListItemsConfigChange: (listItemsConfig: ListItemsConfig) => void,
) => {
  const { sortFields, itemsPerPage, criteria } = useMemo<
    Partial<ListItemsConfig>
  >(() => listItemsConfig ?? {}, []);
  const listItemsConfigRef = useRef<ListItemsConfig>(listItemsConfig);
  listItemsConfigRef.current = listItemsConfig;
  const onListItemsConfigChangeRef = useRef(onListItemsConfigChange);
  onListItemsConfigChangeRef.current = onListItemsConfigChange;

  useEffect(() => {
    onListItemsConfigChangeRef.current({
      ...listItemsConfigRef.current,
      cursor: undefined,
    });
  }, [
    // TODO: Include selected fields when implemented.
    sortFields,
    itemsPerPage,
    criteria,
  ]);
};
