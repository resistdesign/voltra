import {
  compare,
  compareArray,
  getFilterTypeInfoDataItemsBySearchCriteria,
  getSortedItems,
} from "./SearchUtils";
import { ComparisonOperators, LogicalOperators } from "./SearchTypes";
import { TypeInfoMap } from "./TypeParsing/TypeInfo";

const getSearchUtilsScenario = () => {
  const items: Array<{
    id: string;
    title: string;
    rating: number;
    tags: string[];
    author: string;
  }> = [
    {
      id: "1",
      title: "Voltra Guide",
      rating: 5,
      tags: ["ts", "guide"],
      author: "person-1",
    },
    {
      id: "2",
      title: "Other",
      rating: 2,
      tags: ["misc"],
      author: "person-2",
    },
    {
      id: "3",
      title: "Voltra Deep Dive",
      rating: 4,
      tags: [],
      author: "person-3",
    },
  ];

  const typeInfoMap: TypeInfoMap = {
    Book: {
      fields: {
        title: {
          type: "string",
          array: false,
          readonly: false,
          optional: false,
        },
        rating: {
          type: "number",
          array: false,
          readonly: false,
          optional: false,
        },
        tags: {
          type: "string",
          array: true,
          readonly: false,
          optional: false,
        },
        author: {
          type: "string",
          typeReference: "Person",
          array: false,
          readonly: false,
          optional: false,
        },
      },
    },
  };

  return { items, typeInfoMap };
};

export const runSearchUtilsCompareScenario = () => {
  const { items } = getSearchUtilsScenario();
  return compare(
    {
      fieldName: "rating",
      operator: ComparisonOperators.GREATER_THAN,
      value: 3,
    },
    items[0].rating,
  );
};

export const runSearchUtilsCompareArrayContainsScenario = () => {
  const { items } = getSearchUtilsScenario();
  return compareArray(
    {
      fieldName: "tags",
      operator: ComparisonOperators.EQUALS,
      value: "ts",
    },
    items[0].tags,
  );
};

export const runSearchUtilsCompareArrayNotContainsScenario = () => {
  const { items } = getSearchUtilsScenario();
  return compareArray(
    {
      fieldName: "tags",
      operator: ComparisonOperators.NOT_CONTAINS,
      value: "ts",
    },
    items[0].tags,
  );
};

export const runSearchUtilsFilterAndScenario = () => {
  const { items, typeInfoMap } = getSearchUtilsScenario();
  const filteredAnd = getFilterTypeInfoDataItemsBySearchCriteria(
    {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "title",
          operator: ComparisonOperators.LIKE,
          value: "Voltra",
        },
        {
          fieldName: "rating",
          operator: ComparisonOperators.GREATER_THAN,
          value: 3,
        },
        {
          fieldName: "tags",
          operator: ComparisonOperators.CONTAINS,
          value: "ts",
        },
        {
          fieldName: "author",
          operator: ComparisonOperators.EQUALS,
          value: "nope",
        },
      ],
    },
    items,
    "Book",
    typeInfoMap,
  );
  return filteredAnd.map((item) => item.id);
};

export const runSearchUtilsFilterOrScenario = () => {
  const { items, typeInfoMap } = getSearchUtilsScenario();
  const filteredOr = getFilterTypeInfoDataItemsBySearchCriteria(
    {
      logicalOperator: LogicalOperators.OR,
      fieldCriteria: [
        {
          fieldName: "title",
          operator: ComparisonOperators.LIKE,
          value: "Missing",
        },
        {
          fieldName: "rating",
          operator: ComparisonOperators.LESS_THAN,
          value: 3,
        },
      ],
    },
    items,
    "Book",
    typeInfoMap,
  );
  return filteredOr.map((item) => item.id);
};

export const runSearchUtilsSortScenario = () => {
  const { items } = getSearchUtilsScenario();
  const sorted = getSortedItems([{ field: "rating", reverse: true }], items);
  return sorted.map((item) => item.id);
};
