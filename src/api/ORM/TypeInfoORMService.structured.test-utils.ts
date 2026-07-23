import { TypeInfoORMService } from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../common/SearchTypes";
import type {
  TypeInfoMap,
  TypeInfoDataItem,
} from "../../common/TypeParsing/TypeInfo";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";

type Post = {
  id: string;
  title: string;
  category: string;
  score: number;
  tags?: string[];
};

const typeInfoMap: TypeInfoMap = {
  Post: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
      category: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
      },
      score: {
        type: "number",
        array: false,
        readonly: false,
        optional: true,
      },
      tags: {
        type: "string",
        array: true,
        readonly: false,
        optional: true,
      },
    },
  },
};

const runTypeInfoORMStructuredScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Post, "id">({
    tableName: "Posts",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => String(++counter),
  });
  const relationshipDriver = new InMemoryItemRelationshipDBDriver({
    tableName: "Relationships",
    uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
  });
  const structuredBackend = new StructuredInMemoryBackend();
  const routingEvents: Array<{
    path: "fullText" | "structured" | "fullScanCompare";
    reason:
      | "fullTextPlan"
      | "structuredEligible"
      | "criteriaWithoutIndexedPath"
      | "indexedPathFailedOrUnsupported";
  }> = [];
  const structuredIndexWriteEvents: Array<{
    action: "upsert" | "remove";
    indexedFieldCount: number;
  }> = [];
  const structuredReaderCalls = {
    terms: 0,
    ranges: 0,
  };
  const structuredReader = {
    terms: {
      query: async (
        ...args: Parameters<typeof structuredBackend.terms.query>
      ) => {
        structuredReaderCalls.terms += 1;
        return structuredBackend.terms.query(...args);
      },
    },
    ranges: {
      between: async (
        ...args: Parameters<typeof structuredBackend.ranges.between>
      ) => {
        structuredReaderCalls.ranges += 1;
        return structuredBackend.ranges.between(...args);
      },
      gte: async (...args: Parameters<typeof structuredBackend.ranges.gte>) => {
        structuredReaderCalls.ranges += 1;
        return structuredBackend.ranges.gte(...args);
      },
      lte: async (...args: Parameters<typeof structuredBackend.ranges.lte>) => {
        structuredReaderCalls.ranges += 1;
        return structuredBackend.ranges.lte(...args);
      },
      all: async (...args: Parameters<typeof structuredBackend.ranges.all>) => {
        structuredReaderCalls.ranges += 1;
        return structuredBackend.ranges.all(...args);
      },
    },
    documents: structuredBackend.documents,
    tokenizer: structuredBackend.tokenizer,
  };
  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: () => driver as any,
    getRelationshipDriver: () => relationshipDriver,
    indexing: {
      structured: {
        reader: structuredReader,
        writer: structuredBackend,
        indexedFieldsByType: {
          Post: ["title", "category", "score", "tags"],
        },
      },
      observability: {
        onListRoutingDecision: (event) => {
          routingEvents.push({ path: event.path, reason: event.reason });
        },
        onStructuredIndexWrite: (event) => {
          structuredIndexWriteEvents.push({
            action: event.action,
            indexedFieldCount: event.indexedFieldCount,
          });
        },
      },
    },
    useDAC: false,
  });

  const id1 = await orm.create("Post", {
    title: "Hello",
    category: "news",
    score: 10,
    tags: ["a", "b"],
  } as TypeInfoDataItem);
  const id2 = await orm.create("Post", {
    title: "World",
    category: "news",
    score: 20,
    tags: ["b"],
  } as TypeInfoDataItem);
  const id3 = await orm.create("Post", {
    title: "Other",
    category: "blog",
    score: 5,
    tags: ["c"],
  } as TypeInfoDataItem);

  const news = await orm.list("Post", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "category",
          operator: ComparisonOperators.EQUALS,
          value: "news",
        },
      ],
    },
  });

  const tagsB = await orm.list("Post", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "tags",
          operator: ComparisonOperators.CONTAINS,
          value: "b",
        },
      ],
    },
  });

  const scoreBetween = await orm.list("Post", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "score",
          operator: ComparisonOperators.BETWEEN,
          valueOptions: [6, 15],
        },
      ],
    },
  });

  const page1 = await orm.list("Post", {
    itemsPerPage: 1,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "category",
          operator: ComparisonOperators.EQUALS,
          value: "news",
        },
      ],
    },
  });
  const page2 = await orm.list("Post", {
    itemsPerPage: 1,
    cursor: page1.cursor,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "category",
          operator: ComparisonOperators.EQUALS,
          value: "news",
        },
      ],
    },
  });

  const globallySorted = await orm.list("Post", {
    itemsPerPage: 3,
    sortFields: [{ field: "title", reverse: true }],
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "score",
          operator: ComparisonOperators.BETWEEN,
          valueOptions: [0, 100],
        },
      ],
    },
  });

  await structuredBackend.write("0", {
    title: "Ghost",
    category: "news",
    score: 99,
  });
  const hydrationFilled = await orm.list("Post", {
    itemsPerPage: 2,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "category",
          operator: ComparisonOperators.EQUALS,
          value: "news",
        },
      ],
    },
  });
  await structuredBackend.write("0", {});

  let invalidCursorPropagated = false;
  try {
    await orm.list("Post", {
      itemsPerPage: 1,
      cursor: "not-a-structured-cursor",
      criteria: {
        logicalOperator: LogicalOperators.AND,
        fieldCriteria: [
          {
            fieldName: "category",
            operator: ComparisonOperators.EQUALS,
            value: "news",
          },
        ],
      },
    });
  } catch (error: any) {
    invalidCursorPropagated =
      error?.message === "Invalid structured search cursor.";
  }

  await orm.update("Post", {
    id: id1,
    title: "Hello",
    category: "archive",
    score: 10,
    tags: ["a", "b"],
  } as TypeInfoDataItem);
  const afterUpdate = await orm.list("Post", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "category",
          operator: ComparisonOperators.EQUALS,
          value: "news",
        },
      ],
    },
  });

  const structuredCallCountAfterConfiguredQuery =
    structuredReaderCalls.terms + structuredReaderCalls.ranges;
  const unindexedTitleQuery = await orm.list("Post", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "id",
          operator: ComparisonOperators.EQUALS,
          value: "2",
        },
      ],
    },
  });
  const structuredCallCountAfterUnindexedQuery =
    structuredReaderCalls.terms + structuredReaderCalls.ranges;

  const noteTypeInfoMap: TypeInfoMap = {
    Note: {
      primaryField: "noteKey",
      fields: {
        noteKey: {
          type: "string",
          array: false,
          readonly: false,
          optional: true,
        },
        title: {
          type: "string",
          array: false,
          readonly: false,
          optional: true,
        },
        priority: {
          type: "number",
          array: false,
          readonly: false,
          optional: true,
        },
      },
    },
  };
  let noteCounter = 0;
  const noteDriver = new InMemoryDataItemDBDriver<any, "noteKey">({
    tableName: "Notes",
    uniquelyIdentifyingFieldName: "noteKey",
    generateUniqueIdentifier: () => `n-${++noteCounter}`,
  });
  const noteStructuredBackend = new StructuredInMemoryBackend();
  const noteOrm = new TypeInfoORMService({
    typeInfoMap: noteTypeInfoMap,
    getDriver: () => noteDriver as any,
    getRelationshipDriver: () => relationshipDriver,
    indexing: {
      structured: {
        reader: noteStructuredBackend,
        writer: noteStructuredBackend,
        indexedFieldsByType: {
          Note: ["title", "priority"],
        },
      },
    },
    useDAC: false,
  });
  const noteId = await noteOrm.create("Note", {
    title: "Roadmap",
    priority: 2,
  } as TypeInfoDataItem);
  await noteOrm.create("Note", {
    title: "Backlog",
    priority: 5,
  } as TypeInfoDataItem);
  const noteByTitle = await noteOrm.list("Note", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "title",
          operator: ComparisonOperators.EQUALS,
          value: "Roadmap",
        },
      ],
    },
  });

  return {
    createdIds: [id1, id2, id3],
    newsIds: news.items.map((item) => item.id),
    tagsBIds: tagsB.items.map((item) => item.id),
    scoreBetweenIds: scoreBetween.items.map((item) => item.id),
    page1Ids: page1.items.map((item) => item.id),
    page2Ids: page2.items.map((item) => item.id),
    globallySortedIds: globallySorted.items.map((item) => item.id),
    hydrationFilledIds: hydrationFilled.items.map((item) => item.id),
    invalidCursorPropagated,
    afterUpdateIds: afterUpdate.items.map((item) => item.id),
    configuredQueryUsedStructured: structuredCallCountAfterConfiguredQuery > 0,
    unconfiguredQueryFellBackWithoutStructuredCall:
      structuredCallCountAfterUnindexedQuery ===
      structuredCallCountAfterConfiguredQuery,
    unindexedTitleIds: unindexedTitleQuery.items.map((item) => item.id),
    nonIdPrimaryFieldIds: noteByTitle.items.map((item) => item.noteKey),
    generatedNonIdPrimaryFieldId: noteId,
    sawStructuredRoutingDecision: routingEvents.some(
      (event) => event.path === "structured",
    ),
    sawFullScanFallbackRoutingDecision: routingEvents.some(
      (event) =>
        event.path === "fullScanCompare" &&
        (event.reason === "criteriaWithoutIndexedPath" ||
          event.reason === "indexedPathFailedOrUnsupported"),
    ),
    sawStructuredIndexWriteTelemetry:
      structuredIndexWriteEvents.some((event) => event.action === "upsert") &&
      structuredIndexWriteEvents.some((event) => event.indexedFieldCount > 0),
  };
};

export const runTypeInfoORMStructuredCreatedIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).createdIds;

export const runTypeInfoORMStructuredNewsIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).newsIds;

export const runTypeInfoORMStructuredTagsBIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).tagsBIds;

export const runTypeInfoORMStructuredScoreBetweenIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).scoreBetweenIds;

export const runTypeInfoORMStructuredPage1IdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).page1Ids;

export const runTypeInfoORMStructuredPage2IdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).page2Ids;

export const runTypeInfoORMStructuredGloballySortedIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).globallySortedIds;

export const runTypeInfoORMStructuredHydrationFilledIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).hydrationFilledIds;

export const runTypeInfoORMStructuredInvalidCursorPropagatedScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario()).invalidCursorPropagated;

export const runTypeInfoORMStructuredAfterUpdateIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).afterUpdateIds;

export const runTypeInfoORMStructuredConfiguredQueryUsedStructuredScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario()).configuredQueryUsedStructured;

export const runTypeInfoORMStructuredUnconfiguredQueryFallbackScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario())
      .unconfiguredQueryFellBackWithoutStructuredCall;

export const runTypeInfoORMStructuredUnindexedTitleIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).unindexedTitleIds;

export const runTypeInfoORMStructuredNonIdPrimaryFieldIdsScenario = async () =>
  (await runTypeInfoORMStructuredScenario()).nonIdPrimaryFieldIds;

export const runTypeInfoORMStructuredGeneratedNonIdPrimaryFieldIdScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario()).generatedNonIdPrimaryFieldId;

export const runTypeInfoORMStructuredSawStructuredRoutingDecisionScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario()).sawStructuredRoutingDecision;

export const runTypeInfoORMStructuredSawFullScanFallbackRoutingDecisionScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario())
      .sawFullScanFallbackRoutingDecision;

export const runTypeInfoORMStructuredSawStructuredIndexWriteTelemetryScenario =
  async () =>
    (await runTypeInfoORMStructuredScenario()).sawStructuredIndexWriteTelemetry;
