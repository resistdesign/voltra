import {
  ComparisonOperators,
  type FieldCriterion,
  LogicalOperators,
  type SearchCriteria,
} from "../../common/SearchTypes";
import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import { TypeInfoORMService } from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import type { DataItemDBDriver } from "./drivers/common/Types";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import { FullTextMemoryBackend } from "../Indexing/fulltext/FullTextMemoryBackend";
import { createIndexBackend } from "../Indexing/query";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "./getTypeInfoORMIndexingConfigFromTypeInfoMap";

type RecordItem = {
  id: string;
  title: string;
  category: string;
  score: number;
  tags?: string[];
  summary?: string;
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
        tags: { primaryField: true },
      },
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { text: true } },
      },
      category: {
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
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: true,
        tags: { indexed: { exact: true, membership: true } },
      },
      summary: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
    },
  },
};

const seedRecords: Omit<RecordItem, "id">[] = [
  {
    title: "alpha bravo",
    category: "news",
    score: 5,
    tags: ["red", "blue"],
    summary: "intro",
  },
  {
    title: "alpha x bravo",
    category: "blog",
    score: 10,
    tags: ["blue"],
    summary: "",
  },
  {
    title: "bravo charlie",
    category: "news",
    score: 15,
    tags: ["green", "red"],
  },
  {
    title: "delta",
    category: "guide",
    score: 20,
    tags: [],
    summary: "tail",
  },
  {
    title: "omega",
    category: "blog",
    score: 25,
    tags: ["yellow"],
    summary: "zeta",
  },
];

const buildOrm = (
  indexing?: ConstructorParameters<typeof TypeInfoORMService>[0]["indexing"],
) => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<RecordItem, "id">({
    tableName: "Record",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `record-${++counter}`,
  });

  return new TypeInfoORMService({
    typeInfoMap,
    getDriver: () => driver as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => {
      throw new Error("unused");
    },
    useDAC: false,
    indexing,
  });
};

const seed = async (orm: TypeInfoORMService): Promise<void> => {
  for (const item of seedRecords) {
    await orm.create("Record", item);
  }
};

const toSortedIds = (items: Array<Partial<RecordItem>>): string[] =>
  items.map((item) => String(item.id)).sort();

const runSingleCriterionSearch = async (
  orm: TypeInfoORMService,
  criterion: FieldCriterion,
): Promise<string[]> => {
  const criteria: SearchCriteria = {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [criterion],
  };
  const result = await orm.list("Record", { itemsPerPage: 50, criteria }, [
    "id",
  ]);

  return toSortedIds(result.items as Array<Partial<RecordItem>>);
};

const runOperatorCoverageScenario = async () => {
  const structuredBackend = new StructuredInMemoryBackend();
  const fullTextBackend = new FullTextMemoryBackend();

  const indexedOrm = buildOrm(
    getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({
        values: structuredBackend,
        valueWriter: structuredBackend,
        text: fullTextBackend,
      }),
      allowFullScanFallback: true,
    }),
  );
  const fallbackOrm = buildOrm();

  await seed(indexedOrm);
  await seed(fallbackOrm);

  return {
    equalsIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "category",
      operator: ComparisonOperators.EQUALS,
      value: "news",
    }),
    notEqualsIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "category",
      operator: ComparisonOperators.NOT_EQUALS,
      value: "news",
    }),
    greaterThanIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "score",
      operator: ComparisonOperators.GREATER_THAN,
      value: 15,
    }),
    greaterThanOrEqualIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "score",
      operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
      value: 15,
    }),
    lessThanIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "score",
      operator: ComparisonOperators.LESS_THAN,
      value: 10,
    }),
    lessThanOrEqualIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "score",
      operator: ComparisonOperators.LESS_THAN_OR_EQUAL,
      value: 10,
    }),
    inIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "category",
      operator: ComparisonOperators.IN,
      valueOptions: ["news", "guide"],
    }),
    notInIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "category",
      operator: ComparisonOperators.NOT_IN,
      valueOptions: ["news", "guide"],
    }),
    likeIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "title",
      operator: ComparisonOperators.LIKE,
      value: "alpha bravo",
    }),
    notLikeIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "title",
      operator: ComparisonOperators.NOT_LIKE,
      value: "alpha",
    }),
    existsIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "summary",
      operator: ComparisonOperators.EXISTS,
    }),
    notExistsIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "summary",
      operator: ComparisonOperators.NOT_EXISTS,
    }),
    isNotEmptyIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "summary",
      operator: ComparisonOperators.IS_NOT_EMPTY,
    }),
    isEmptyIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "summary",
      operator: ComparisonOperators.IS_EMPTY,
    }),
    betweenIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "score",
      operator: ComparisonOperators.BETWEEN,
      valueOptions: [10, 20],
    }),
    notBetweenIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "score",
      operator: ComparisonOperators.NOT_BETWEEN,
      valueOptions: [10, 20],
    }),
    containsFullTextIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "title",
      operator: ComparisonOperators.TEXT_PHRASE,
      value: "alpha bravo",
    }),
    containsArrayIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "tags",
      operator: ComparisonOperators.CONTAINS,
      value: "red",
    }),
    notContainsIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "tags",
      operator: ComparisonOperators.NOT_CONTAINS,
      value: "red",
    }),
    startsWithIds: await runSingleCriterionSearch(indexedOrm, {
      fieldName: "title",
      operator: ComparisonOperators.STARTS_WITH,
      value: "alp",
    }),
    endsWithIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "title",
      operator: ComparisonOperators.ENDS_WITH,
      value: "charlie",
    }),
    doesNotStartWithIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "title",
      operator: ComparisonOperators.DOES_NOT_START_WITH,
      value: "alpha",
    }),
    doesNotEndWithIds: await runSingleCriterionSearch(fallbackOrm, {
      fieldName: "title",
      operator: ComparisonOperators.DOES_NOT_END_WITH,
      value: "charlie",
    }),
  };
};

let cachedScenarioPromise:
  Promise<Awaited<ReturnType<typeof runOperatorCoverageScenario>>> | undefined;

const getScenario = async () => {
  if (!cachedScenarioPromise) {
    cachedScenarioPromise = runOperatorCoverageScenario();
  }

  return cachedScenarioPromise;
};

export const runTypeInfoORMOperatorCoverageEqualsIdsScenario = async () =>
  (await getScenario()).equalsIds;
export const runTypeInfoORMOperatorCoverageNotEqualsIdsScenario = async () =>
  (await getScenario()).notEqualsIds;
export const runTypeInfoORMOperatorCoverageGreaterThanIdsScenario = async () =>
  (await getScenario()).greaterThanIds;
export const runTypeInfoORMOperatorCoverageGreaterThanOrEqualIdsScenario =
  async () => (await getScenario()).greaterThanOrEqualIds;
export const runTypeInfoORMOperatorCoverageLessThanIdsScenario = async () =>
  (await getScenario()).lessThanIds;
export const runTypeInfoORMOperatorCoverageLessThanOrEqualIdsScenario =
  async () => (await getScenario()).lessThanOrEqualIds;
export const runTypeInfoORMOperatorCoverageInIdsScenario = async () =>
  (await getScenario()).inIds;
export const runTypeInfoORMOperatorCoverageNotInIdsScenario = async () =>
  (await getScenario()).notInIds;
export const runTypeInfoORMOperatorCoverageLikeIdsScenario = async () =>
  (await getScenario()).likeIds;
export const runTypeInfoORMOperatorCoverageNotLikeIdsScenario = async () =>
  (await getScenario()).notLikeIds;
export const runTypeInfoORMOperatorCoverageExistsIdsScenario = async () =>
  (await getScenario()).existsIds;
export const runTypeInfoORMOperatorCoverageNotExistsIdsScenario = async () =>
  (await getScenario()).notExistsIds;
export const runTypeInfoORMOperatorCoverageIsNotEmptyIdsScenario = async () =>
  (await getScenario()).isNotEmptyIds;
export const runTypeInfoORMOperatorCoverageIsEmptyIdsScenario = async () =>
  (await getScenario()).isEmptyIds;
export const runTypeInfoORMOperatorCoverageBetweenIdsScenario = async () =>
  (await getScenario()).betweenIds;
export const runTypeInfoORMOperatorCoverageNotBetweenIdsScenario = async () =>
  (await getScenario()).notBetweenIds;
export const runTypeInfoORMOperatorCoverageContainsFullTextIdsScenario =
  async () => (await getScenario()).containsFullTextIds;
export const runTypeInfoORMOperatorCoverageContainsArrayIdsScenario =
  async () => (await getScenario()).containsArrayIds;
export const runTypeInfoORMOperatorCoverageNotContainsIdsScenario = async () =>
  (await getScenario()).notContainsIds;
export const runTypeInfoORMOperatorCoverageStartsWithIdsScenario = async () =>
  (await getScenario()).startsWithIds;
export const runTypeInfoORMOperatorCoverageEndsWithIdsScenario = async () =>
  (await getScenario()).endsWithIds;
export const runTypeInfoORMOperatorCoverageDoesNotStartWithIdsScenario =
  async () => (await getScenario()).doesNotStartWithIds;
export const runTypeInfoORMOperatorCoverageDoesNotEndWithIdsScenario =
  async () => (await getScenario()).doesNotEndWithIds;
