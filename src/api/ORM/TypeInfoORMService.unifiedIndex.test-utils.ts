import {
  ComparisonOperators,
  LogicalOperators,
  type SearchCriteria,
} from "../../common/SearchTypes";
import type {
  TypeInfoDataItem,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";
import { createIndexBackend } from "../Indexing/query";
import { FullTextMemoryBackend } from "../Indexing/fulltext/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import type { DataItemDBDriver } from "./drivers";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "./getTypeInfoORMIndexingConfigFromTypeInfoMap";
import { TypeInfoORMService } from "./TypeInfoORMService";

type RecordItem = {
  id: string;
  title: string;
  state: "draft" | "published";
  score: number;
};

const typeInfoMap: TypeInfoMap = {
  Record: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { text: true } },
      },
      state: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { exact: true, range: true } },
      },
      score: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { exact: true, range: true } },
      },
    },
  },
};

const buildScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<RecordItem, "id">({
    tableName: "Record",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => String(++counter),
  });
  const values = new StructuredInMemoryBackend();
  const text = new FullTextMemoryBackend();
  const routing: string[] = [];
  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: () => driver as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => {
      throw new Error("unused");
    },
    useDAC: false,
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({
        values,
        valueWriter: values,
        text,
      }),
      observability: {
        onListRoutingDecision: ({ path }) => routing.push(path),
      },
    }),
  });

  for (const item of [
    { title: "distributed runtime", state: "published", score: 20 },
    { title: "distributed x runtime", state: "published", score: 40 },
    { title: "queue guide", state: "draft", score: 90 },
    { title: "distributed runtime manual", state: "published", score: 60 },
  ] satisfies Array<Omit<RecordItem, "id">>) {
    await orm.create("Record", item as TypeInfoDataItem);
  }

  const mixedAndCriteria: SearchCriteria = {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "state",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.LIKE,
        value: "distributed runtime",
      },
    ],
  };
  const mixedAnd = await orm.list("Record", {
    itemsPerPage: 10,
    criteria: mixedAndCriteria,
  });
  const mixedOr = await orm.list("Record", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.OR,
      fieldCriteria: [
        {
          fieldName: "title",
          operator: ComparisonOperators.TEXT_PHRASE,
          value: "queue guide",
        },
        {
          fieldName: "score",
          operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
          value: 60,
        },
      ],
    },
  });

  await driver.deleteItem("1");
  const refilled = await orm.list("Record", {
    itemsPerPage: 2,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "state",
          operator: ComparisonOperators.EQUALS,
          value: "published",
        },
        {
          fieldName: "title",
          operator: ComparisonOperators.TEXT_LOSSY,
          value: "distributed",
        },
      ],
    },
  });

  return {
    mixedAndIds: mixedAnd.items.map((item) => item.id),
    mixedOrIds: mixedOr.items.map((item) => item.id),
    refilledIds: refilled.items.map((item) => item.id),
    usedOnlyIndexedRoute:
      routing.length === 3 && routing.every((path) => path === "indexed"),
  };
};

let scenario: ReturnType<typeof buildScenario> | undefined;
const getScenario = () => (scenario ??= buildScenario());

export const runUnifiedORMMixedAndScenario = async () =>
  (await getScenario()).mixedAndIds;
export const runUnifiedORMMixedOrScenario = async () =>
  (await getScenario()).mixedOrIds;
export const runUnifiedORMRefillScenario = async () =>
  (await getScenario()).refilledIds;
export const runUnifiedORMRoutingScenario = async () =>
  (await getScenario()).usedOnlyIndexedRoute;
