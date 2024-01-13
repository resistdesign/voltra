import {
  AsyncReturnValue,
  DBServiceItemDriver,
  ListItemResults,
  ListItemsConfig,
} from "./DBServiceTypes";
import {
  Criteria,
  SearchCriterionLogicalGroupingTypes,
  SearchCriterionTypes,
  SearchOperatorTypes,
} from "./SearchCriteriaTypes";
import {
  criteriaListHasDisallowedFieldForOperation,
  criteriaListHasInvalidFieldOrValueType,
  criteriaListHasRelatedField,
  flattenCriterionGroups,
  reduceCriteria,
} from "./CriteriaUtils";

export const DataContextServiceErrorTypes = {
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",
  RELATED_ITEM_SEARCH_NOT_ALLOWED: "RELATED_ITEM_SEARCH_NOT_ALLOWED",
  OPERATION_NOT_ALLOWED_FOR_FIELD: "OPERATION_NOT_ALLOWED_FOR_FIELD",
  INVALID_CRITERION: "INVALID_CRITERION",
};

export type DataContextOperationOptions =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LIST";

export const DataContextOperations: Record<
  DataContextOperationOptions,
  DataContextOperationOptions
> = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LIST: "LIST",
};

export const dataContextOperationIsAllowed = (
  operation: DataContextOperationOptions,
  allowedOperations: DataContextOperationOptions[] = [],
) => allowedOperations.includes(operation);

export const getDataContextOperationNotAllowed = (
  operation: DataContextOperationOptions,
) =>
  new Error(
    `${DataContextServiceErrorTypes.OPERATION_NOT_ALLOWED}: ${operation}`,
  );

export type DataContextField = {
  typeName: string;
  isContext?: boolean;
  isMultiple?: boolean;
  allowedOperations?: DataContextOperationOptions[];
  embedded?: boolean;
};

export type DataContext<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = {
  itemTypeName: string;
  resolvedType?: string;
  isTypeAlias?: boolean;
  uniquelyIdentifyingFieldName: UniquelyIdentifyingFieldName;
  allowedOperations?: DataContextOperationOptions[];
  fields: Partial<Record<keyof ItemType, DataContextField>>;
};

export type DataContextItemType<DC> = DC extends DataContext<infer T, any>
  ? T
  : never;
export type DataContextUniquelyIdentifyingFieldName<DC> =
  DC extends DataContext<any, infer T> ? T : never;
export type DataContextUniquelyIdentifyingFieldType<DC> =
  DataContextItemType<DC>[DataContextUniquelyIdentifyingFieldName<DC>];

export type NewItemType<
  ItemType extends Record<any, any>,
  UniquelyIdentifyingFieldName extends keyof ItemType,
> = ItemType | Omit<ItemType, UniquelyIdentifyingFieldName>;

export type DataContextMap = Record<string, DataContext<any, any>>;

export type DataContextOperationProvider<
  T extends Record<
    Lowercase<DataContextOperationOptions>,
    (...args: any[]) => AsyncReturnValue<any>
  >,
> = T;

export type DataContextCreateOrUpdateOperation<DCM extends DataContextMap> = <
  ContextName extends keyof DCM,
  UpdateFlag extends boolean,
>(
  contextName: ContextName,
  item: UpdateFlag extends true
    ? DataContextItemType<DCM[ContextName]>
    : NewItemType<
        DataContextItemType<DCM[ContextName]>,
        DataContextUniquelyIdentifyingFieldName<DCM[ContextName]>
      >,
  update?: UpdateFlag,
) => AsyncReturnValue<DataContextItemType<DCM[ContextName]>>;

export type DataContextService<DCM extends DataContextMap> =
  DataContextOperationProvider<{
    create: <ContextName extends keyof DCM>(
      contextName: ContextName,
      item: NewItemType<
        DataContextItemType<DCM[ContextName]>,
        DataContextUniquelyIdentifyingFieldName<DCM[ContextName]>
      >,
    ) => AsyncReturnValue<DataContextItemType<DCM[ContextName]>>;
    read: <ContextName extends keyof DCM>(
      contextName: ContextName,
      itemId: DataContextUniquelyIdentifyingFieldType<DCM>,
    ) => AsyncReturnValue<DataContextItemType<DCM[ContextName]>>;
    update: <ContextName extends keyof DCM>(
      contextName: ContextName,
      item: DataContextItemType<DCM[ContextName]>,
    ) => AsyncReturnValue<DataContextItemType<DCM[ContextName]>>;
    delete: <ContextName extends keyof DCM>(
      contextName: ContextName,
      itemId: DataContextUniquelyIdentifyingFieldType<DCM>,
    ) => AsyncReturnValue<DataContextItemType<DCM[ContextName]>>;
    list: <ContextName extends keyof DCM>(
      contextName: ContextName,
      config: ListItemsConfig,
    ) => AsyncReturnValue<
      ListItemResults<DataContextItemType<DCM[ContextName]>>
    >;
  }>;

export type DataContextRelationship<
  FromDataContext extends DataContext<any, any>,
  ToDataContext extends DataContext<any, any>,
> = {
  id: string;
  fromContext: FromDataContext["itemTypeName"];
  fromField: keyof DataContextItemType<FromDataContext>;
  fromUniqueIdentifier: DataContextUniquelyIdentifyingFieldName<FromDataContext>;
  toContext: ToDataContext["itemTypeName"];
  toUniqueIdentifier: DataContextUniquelyIdentifyingFieldName<ToDataContext>;
};

export type GetDataContextServiceConfig<DCM extends DataContextMap> = {
  dataContextMap: DCM;
  itemDriverMap: Record<
    keyof DCM,
    DBServiceItemDriver<
      DataContextItemType<DCM[keyof DCM]>,
      DataContextUniquelyIdentifyingFieldType<DCM[keyof DCM]>
    >
  >;
  relationshipItemDriver?: DBServiceItemDriver<
    DataContextRelationship<
      DataContextItemType<DCM[keyof DCM]>,
      DataContextItemType<DCM[keyof DCM]>
    >,
    "id"
  >;
};

export const getDataContextService = <DCM extends DataContextMap>(
  config: GetDataContextServiceConfig<DCM>,
): DataContextService<DCM> => {
  const { dataContextMap, itemDriverMap, relationshipItemDriver } = config;
  const createOrUpdate: DataContextCreateOrUpdateOperation<DCM> = async (
    contextName,
    item,
    update?,
  ) => {
    const serviceOperation =
      update === true
        ? DataContextOperations.UPDATE
        : DataContextOperations.CREATE;
    const {
      allowedOperations = [],
      fields: dataContextFields = {},
      uniquelyIdentifyingFieldName,
    } = dataContextMap[contextName as keyof DCM];
    type ItemType = DataContextItemType<DCM[typeof contextName]>;
    type CreateItemType = NewItemType<
      ItemType,
      DataContextUniquelyIdentifyingFieldName<DCM[typeof contextName]>
    >;

    // Check allowed operations for the context.
    if (dataContextOperationIsAllowed(serviceOperation, allowedOperations)) {
      const itemDriver = itemDriverMap[contextName as keyof DCM];
      const newItem: Partial<Record<keyof ItemType, any>> = {};
      const relatedIdMap: Record<any, any[]> = {};

      for (const f in dataContextFields) {
        const {
          isContext = false,
          isMultiple = false,
          embedded = false,
          typeName,
          allowedOperations: allowedFieldOperations = [],
        }: Partial<DataContextField> = dataContextFields[f] || {};

        // Check allowed operations for the field.
        if (
          f !== uniquelyIdentifyingFieldName &&
          dataContextOperationIsAllowed(
            serviceOperation,
            allowedFieldOperations,
          )
        ) {
          if (!isContext || embedded) {
            // Only create based on non-relational fields in the data context.
            newItem[f as keyof CreateItemType] =
              item[f as keyof CreateItemType];
          } else {
            // Normalize to an array.
            const baseValue = item[f as keyof CreateItemType];
            const arrayValue = isMultiple
              ? [...((baseValue as any) instanceof Array ? baseValue : [])]
              : [baseValue];
            const {
              uniquelyIdentifyingFieldName: uniquelyIdentifyingFieldNameForItem,
            } = dataContextMap[typeName as keyof DCM];

            for (const relatedItem of arrayValue) {
              if (!!relatedItem) {
                const isExistingItem =
                  !!relatedItem[
                    uniquelyIdentifyingFieldNameForItem as keyof typeof relatedItem
                  ];
                const relatedIdListForField =
                  relatedIdMap[f as keyof ItemType] || [];

                let targetIdentifier =
                  relatedItem[
                    uniquelyIdentifyingFieldNameForItem as keyof typeof relatedItem
                  ];

                if (!isExistingItem) {
                  // Create item.
                  const {
                    [uniquelyIdentifyingFieldNameForItem]: newIdentifier,
                  } = await service.create(typeName as keyof DCM, relatedItem);

                  // Set targetIdentifier to the newly created item's identifier.
                  targetIdentifier = newIdentifier;
                } else {
                  // Update item.
                  await service.update(typeName as keyof DCM, relatedItem);
                }

                // Add the related item's identifier to the relatedIdMap.
                relatedIdMap[f as keyof ItemType] = [
                  ...relatedIdListForField,
                  targetIdentifier,
                ];
              }
            }
          }
        }
      }

      const { [uniquelyIdentifyingFieldName]: newItemIdentifier } =
        await itemDriver.createItem(newItem);

      if (relationshipItemDriver) {
        // Create relationships for fields in the data context.
        for (const f in relatedIdMap) {
          const relatedIdListForField = relatedIdMap[f as keyof ItemType] || [];
          const { typeName }: Partial<DataContextField> =
            dataContextFields[f] || {};
          const {
            uniquelyIdentifyingFieldName: uniquelyIdentifyingFieldNameForItem,
          } = dataContextMap[typeName as keyof DCM];

          // Remove omitted relationships on update.
          if (update) {
            const { [uniquelyIdentifyingFieldName]: updatingItemIdentifier } =
              item;
            const { items: allExistingRelationships } =
              await relationshipItemDriver.listItems({
                itemsPerPage: Infinity,
                criteria: {
                  type: SearchCriterionTypes.CRITERION_GROUP,
                  logicalGroupingType: SearchCriterionLogicalGroupingTypes.AND,
                  criteria: [
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "fromContext",
                      operator: SearchOperatorTypes.EQUAL,
                      value: contextName,
                    },
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "fromField",
                      operator: SearchOperatorTypes.EQUAL,
                      value: f,
                    },
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "fromUniqueIdentifier",
                      operator: SearchOperatorTypes.EQUAL,
                      value: updatingItemIdentifier,
                    },
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "toContext",
                      operator: SearchOperatorTypes.EQUAL,
                      value: typeName,
                    },
                  ],
                },
              });
            const allExistingRelationshipIds = allExistingRelationships.map(
              ({ toUniqueIdentifier }) => toUniqueIdentifier,
            );
            const allExistingRelationshipsIdsMap: Record<
              DataContextUniquelyIdentifyingFieldType<any>,
              string
            > = allExistingRelationships.reduce(
              (acc, { id, toUniqueIdentifier }) => ({
                ...acc,
                [toUniqueIdentifier]: id,
              }),
              {},
            );

            // Create relationships that are in the updating item but not in the existing item.
            for (const relatedId of relatedIdListForField) {
              if (!allExistingRelationshipIds.includes(relatedId)) {
                await relationshipItemDriver.createItem({
                  fromContext: contextName,
                  fromField: f as keyof ItemType,
                  fromUniqueIdentifier: updatingItemIdentifier,
                  toContext: typeName as keyof DCM,
                  toUniqueIdentifier: uniquelyIdentifyingFieldNameForItem,
                });
              }
            }

            // Remove relationships that are not in the updating item.
            for (const existingRelatedId of allExistingRelationshipIds) {
              if (!relatedIdListForField.includes(existingRelatedId)) {
                await relationshipItemDriver.deleteItem(
                  allExistingRelationshipsIdsMap[existingRelatedId],
                );
              }
            }
          } else {
            for (const relatedId of relatedIdListForField) {
              await relationshipItemDriver.createItem({
                fromContext: contextName,
                fromField: f as keyof ItemType,
                fromUniqueIdentifier: newItemIdentifier,
                toContext: typeName as keyof DCM,
                toUniqueIdentifier: uniquelyIdentifyingFieldNameForItem,
              });
            }
          }
        }
      }

      // Make sure READ is allowed, if not just return the given item.
      if (
        dataContextOperationIsAllowed(
          DataContextOperations.READ,
          allowedOperations,
        )
      ) {
        // Read and return the new item.
        return service.read(contextName, newItemIdentifier);
      } else {
        return {
          ...newItem,
          [uniquelyIdentifyingFieldName]: newItemIdentifier,
        } as ItemType;
      }
    } else {
      throw getDataContextOperationNotAllowed(serviceOperation);
    }
  };
  const readItem = async <ContextName extends keyof DCM>(
    contextName: ContextName,
    itemId: DataContextUniquelyIdentifyingFieldType<DCM>,
    serviceOperation: DataContextOperationOptions,
  ) => {
    const {
      allowedOperations = [],
      fields: dataContextFields = {},
      uniquelyIdentifyingFieldName,
    } = dataContextMap[contextName as keyof DCM];
    type ItemType = DataContextItemType<DCM[typeof contextName]>;

    // Check allowed operations for the context.
    if (dataContextOperationIsAllowed(serviceOperation, allowedOperations)) {
      const itemDriver = itemDriverMap[contextName as keyof DCM];
      const newItem: Partial<ItemType> = {};

      let readableFields = [uniquelyIdentifyingFieldName];

      for (const f in dataContextFields) {
        const {
          isContext = false,
          isMultiple = false,
          embedded = false,
          typeName,
          allowedOperations: allowedFieldOperations = [],
        }: Partial<DataContextField> = dataContextFields[f] || {};

        if (
          f !== uniquelyIdentifyingFieldName &&
          dataContextOperationIsAllowed(
            serviceOperation,
            allowedFieldOperations,
          )
        ) {
          if (!isContext || embedded) {
            readableFields = [...readableFields, f];
          } else if (relationshipItemDriver) {
            const { items: relatedItemInfoList = [] } =
              await relationshipItemDriver.listItems({
                itemsPerPage: Infinity,
                criteria: {
                  type: SearchCriterionTypes.CRITERION_GROUP,
                  logicalGroupingType: SearchCriterionLogicalGroupingTypes.AND,
                  criteria: [
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "fromContext",
                      operator: SearchOperatorTypes.EQUAL,
                      value: contextName,
                    },
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "fromField",
                      operator: SearchOperatorTypes.EQUAL,
                      value: f,
                    },
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "fromUniqueIdentifier",
                      operator: SearchOperatorTypes.EQUAL,
                      value: itemId,
                    },
                    {
                      type: SearchCriterionTypes.CRITERION,
                      field: "toContext",
                      operator: SearchOperatorTypes.EQUAL,
                      value: typeName,
                    },
                  ],
                },
              });
            const relatedItemIdList = relatedItemInfoList.map(
              ({ toUniqueIdentifier }) => toUniqueIdentifier,
            );

            let newRelationalValue;

            if (isMultiple) {
              newRelationalValue = [];

              for (const relatedItemId of relatedItemIdList) {
                const relatedItem = await service.read(
                  typeName as keyof DCM,
                  relatedItemId as any,
                );

                newRelationalValue.push(relatedItem);
              }
            } else {
              const lastRelatedItemId =
                relatedItemIdList[relatedItemIdList.length - 1];

              newRelationalValue = await service.read(
                typeName as keyof DCM,
                lastRelatedItemId as any,
              );
            }

            newItem[f as keyof ItemType] = newRelationalValue;
          }
        }
      }

      // Read the item from the item driver.
      const itemFromDriver = await itemDriver.readItem(itemId);
      const cleanItemFromDriver = readableFields.reduce(
        (acc, field) => ({
          ...acc,
          [field]: itemFromDriver[field],
        }),
        {},
      );

      return {
        ...newItem,
        ...cleanItemFromDriver,
      } as ItemType;
    } else {
      throw getDataContextOperationNotAllowed(serviceOperation);
    }
  };
  const service: DataContextService<DCM> = {
    create: async (contextName, item) => createOrUpdate(contextName, item),
    read: async (contextName, itemId) =>
      readItem(contextName, itemId, DataContextOperations.READ),
    update: async (contextName, item) =>
      createOrUpdate(contextName, item, true),
    delete: async (contextName, itemId) => {
      type ItemType = DataContextItemType<DCM[typeof contextName]>;
      const { allowedOperations = [], uniquelyIdentifyingFieldName } =
        dataContextMap[contextName as keyof DCM];

      let returnItem;

      if (
        dataContextOperationIsAllowed(
          DataContextOperations.READ,
          allowedOperations,
        )
      ) {
        returnItem = await service.read(contextName, itemId);
      } else {
        returnItem = {
          [uniquelyIdentifyingFieldName]: itemId,
        } as ItemType;
      }

      // Check allowed operations for the context.
      if (
        dataContextOperationIsAllowed(
          DataContextOperations.DELETE,
          allowedOperations,
        )
      ) {
        // Delete item.
        const itemDriver = itemDriverMap[contextName as keyof DCM];

        await itemDriver.deleteItem(itemId);

        if (relationshipItemDriver) {
          // Delete relationships.
          const allRelationships = await relationshipItemDriver.listItems({
            itemsPerPage: Infinity,
            criteria: {
              type: SearchCriterionTypes.CRITERION_GROUP,
              logicalGroupingType: SearchCriterionLogicalGroupingTypes.OR,
              criteria: [
                {
                  type: SearchCriterionTypes.CRITERION,
                  field: "fromContext",
                  operator: SearchOperatorTypes.EQUAL,
                  value: contextName,
                },
                {
                  type: SearchCriterionTypes.CRITERION,
                  field: "fromUniqueIdentifier",
                  operator: SearchOperatorTypes.EQUAL,
                  value: itemId,
                },
              ],
            },
          });

          for (const { id } of allRelationships.items) {
            await relationshipItemDriver.deleteItem(id);
          }
        }

        return returnItem;
      } else {
        throw getDataContextOperationNotAllowed(DataContextOperations.DELETE);
      }
    },
    list: async (contextName, config) => {
      type ItemType = DataContextItemType<DCM[typeof contextName]>;
      const dataContext = dataContextMap[contextName as keyof DCM];
      const { allowedOperations = [], uniquelyIdentifyingFieldName } =
        dataContext;

      if (
        dataContextOperationIsAllowed(
          DataContextOperations.LIST,
          allowedOperations,
        )
      ) {
        const { itemsPerPage = 10, cursor, criteria } = config;
        const { type: criteriaType }: Partial<Criteria> = criteria || {};
        const itemDriver = itemDriverMap[contextName as keyof DCM];
        const reducedCriteria = criteria ? reduceCriteria(criteria) : undefined;
        const criteriaList = flattenCriterionGroups(criteria);

        if (criteriaListHasRelatedField(criteriaList, dataContext)) {
          throw new Error(
            DataContextServiceErrorTypes.RELATED_ITEM_SEARCH_NOT_ALLOWED,
          );
        } else if (
          criteriaListHasDisallowedFieldForOperation(
            criteriaList,
            DataContextOperations.LIST,
            dataContext,
          )
        ) {
          throw new Error(
            DataContextServiceErrorTypes.OPERATION_NOT_ALLOWED_FOR_FIELD,
          );
        } else if (
          criteriaListHasInvalidFieldOrValueType(
            criteriaList,
            contextName,
            dataContextMap,
          )
        ) {
          throw new Error(DataContextServiceErrorTypes.INVALID_CRITERION);
        } else {
          const { items = [], ...otherListItemResultProperties } =
            await itemDriver.listItems({
              itemsPerPage,
              cursor,
              criteria: reducedCriteria,
            });
          const readItemList = await Promise.all(
            items.map(({ [uniquelyIdentifyingFieldName]: id }) =>
              service.read(contextName, id),
            ),
          );

          return {
            items: readItemList,
            ...otherListItemResultProperties,
          };
        }
      } else {
        throw getDataContextOperationNotAllowed(DataContextOperations.LIST);
      }
    },
  };

  return service;
};
