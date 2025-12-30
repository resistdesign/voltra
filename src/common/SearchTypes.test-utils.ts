import {
  ComparisonOperators,
  LogicalOperators,
  SearchCriteria,
  ListItemsConfig,
  TextSearchConfig,
  ListRelationshipsConfig,
  SortField,
} from "./SearchTypes";
import { ItemRelationshipInfoKeys } from "./ItemRelationshipInfoTypes";

export const runSearchTypesScenario = () => {
  const criteria: SearchCriteria = {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "title",
        operator: ComparisonOperators.LIKE,
        value: "Guide",
      },
      {
        fieldName: "publishedAt",
        operator: ComparisonOperators.GREATER_THAN,
        value: "2024-01-01",
      },
    ],
  };

  const sortFields: SortField[] = [
    { field: "publishedAt", reverse: true },
  ];

  const text: TextSearchConfig = {
    query: "Voltra",
    mode: "exact",
    indexField: "title",
  };

  const listConfig: ListItemsConfig = {
    itemsPerPage: 10,
    cursor: "cursor-1",
    criteria,
    sortFields,
    text,
  };

  const relationshipConfig: ListRelationshipsConfig = {
    itemsPerPage: 5,
    relationshipItemOrigin: {
      [ItemRelationshipInfoKeys.fromTypeName]: "Book",
      [ItemRelationshipInfoKeys.fromTypeFieldName]: "author",
      [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: "book-1",
    },
  };

  return {
    criteria,
    listConfig,
    relationshipConfig,
    operators: {
      logical: Object.values(LogicalOperators),
      comparison: Object.values(ComparisonOperators),
    },
  };
};
