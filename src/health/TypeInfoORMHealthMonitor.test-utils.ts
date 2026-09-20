import {
  createIndexBackend,
  FullTextMemoryBackend,
  qualifyIndexField,
  searchLossy,
  StructuredInMemoryBackend,
} from "../api/Indexing";
import { searchStructured } from "../api/Indexing/structured/SearchStructured";
import {
  InMemoryDataItemDBDriver,
  InMemoryItemRelationshipDBDriver,
  type DataItemDBDriver,
} from "../api/ORM/drivers";
import {
  TypeInfoORMService,
  getTypeInfoORMIndexingConfigFromTypeInfoMap,
} from "../api/ORM";
import { ItemRelationshipInfoIdentifyingKeys } from "../common/ItemRelationshipInfoTypes";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../common/SearchTypes";
import type {
  TypeInfoDataItem,
  TypeInfoMap,
} from "../common/TypeParsing/TypeInfo";
import { DriverHealthStore } from "./DriverHealthStore";
import { TypeInfoORMHealthMonitor } from "./TypeInfoORMHealthMonitor";
import { TypeInfoORMHealthOperationRecorder } from "./TypeInfoORMHealthOperationRecorder";
import type { HealthRecord } from "./Types";

type Book = {
  id: string;
  title?: string;
  slug: string;
  rating: number;
};

type Legacy = {
  id: string;
  label: string;
  rank: number;
};

const getBookTypeInfoV1 = (): TypeInfoMap => ({
  Book: {
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
      slug: {
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
        tags: { indexed: { exact: true, range: true } },
      },
    },
  },
});

const getBookTypeInfoV2 = (): TypeInfoMap => ({
  Book: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { primaryField: true },
      },
      slug: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { text: true } },
      },
      rating: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { exact: true, range: true } },
      },
    },
  },
});

const getLegacyTypeInfo = (): TypeInfoMap => ({
  Legacy: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { primaryField: true },
      },
      label: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { text: true } },
      },
      rank: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
        tags: { indexed: { exact: true, range: true } },
      },
    },
  },
});

const mergeTypeInfoMaps = (...maps: TypeInfoMap[]): TypeInfoMap =>
  Object.assign({}, ...maps);

const createOrm = (
  typeInfoMap: TypeInfoMap,
  drivers: Record<string, DataItemDBDriver<any, any>>,
  fullTextBackend: FullTextMemoryBackend,
  structuredBackend: StructuredInMemoryBackend,
  onOperation?: (event: any) => void,
): TypeInfoORMService =>
  new TypeInfoORMService({
    typeInfoMap,
    getDriver: (typeName) => drivers[typeName],
    getRelationshipDriver: () =>
      new InMemoryItemRelationshipDBDriver({
        tableName: "HealthRelationships",
        uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
      }),
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({
        values: structuredBackend,
        valueWriter: structuredBackend,
        text: fullTextBackend,
      }),
      allowFullScanFallback: true,
    }),
    ...(onOperation ? { observability: { onOperation } } : {}),
    useDAC: false,
  });

const createHealthStore = () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<HealthRecord, "id">({
    tableName: "Health",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `health-${++counter}`,
  });
  return new DriverHealthStore(driver);
};

const queryTextIds = async (
  backend: FullTextMemoryBackend,
  typeName: string,
  fieldName: string,
  query: string,
): Promise<Array<string | number>> =>
  (
    await searchLossy({
      backend,
      indexField: qualifyIndexField(typeName, fieldName),
      query,
      limit: 20,
    })
  ).docIds;

const queryStructuredIds = async (
  backend: StructuredInMemoryBackend,
  typeName: string,
  fieldName: string,
  value: string | number,
): Promise<Array<string | number>> =>
  (
    await searchStructured(
      backend,
      {
        type: "term",
        field: qualifyIndexField(typeName, fieldName),
        mode: "eq",
        value,
      },
      { limit: 20 },
    )
  ).candidateIds;

export const runHealthOrphanRepairScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "Books",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `book-${++counter}`,
  });
  const fullTextBackend = new FullTextMemoryBackend();
  const structuredBackend = new StructuredInMemoryBackend();
  const orm = createOrm(
    getBookTypeInfoV1(),
    { Book: driver },
    fullTextBackend,
    structuredBackend,
  );
  const id = await orm.create("Book", {
    title: "Orphan Alpha",
    slug: "orphan-alpha",
    rating: 7,
  } as TypeInfoDataItem);

  await driver.deleteItem(id);
  const store = createHealthStore();
  const monitor = new TypeInfoORMHealthMonitor({
    orm,
    store,
    maxIndexDocumentsPerRun: 20,
    maxRepairsPerRun: 10,
  });

  const preview = await monitor.preview();
  const previewStillIndexed = {
    text: await queryTextIds(fullTextBackend, "Book", "title", "Orphan"),
    structured: await queryStructuredIds(
      structuredBackend,
      "Book",
      "rating",
      7,
    ),
  };
  const repair = await monitor.repair();
  const afterRepair = {
    text: await queryTextIds(fullTextBackend, "Book", "title", "Orphan"),
    structured: await queryStructuredIds(
      structuredBackend,
      "Book",
      "rating",
      7,
    ),
  };
  const repeated = await monitor.repair();

  return {
    previewDetected: preview.orphanFindingCount > 0,
    previewStillIndexed,
    repairDidWork: repair.repairedCount > 0,
    afterRepair,
    repeatedRepairCount: repeated.repairedCount,
  };
};

export const runHealthIndexRaceGuardScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "RaceBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `race-${++counter}`,
  });
  const fullTextBackend = new FullTextMemoryBackend();
  const structuredBackend = new StructuredInMemoryBackend();
  const orm = createOrm(
    getBookTypeInfoV1(),
    { Book: driver },
    fullTextBackend,
    structuredBackend,
  );
  const id = await orm.create("Book", {
    title: "Race Original",
    slug: "race-original",
    rating: 1,
  } as TypeInfoDataItem);
  const page = await structuredBackend.documents?.list?.({ limit: 10 });
  const audited = page?.documents.find((document) => document.docId === id);

  await driver.deleteItem(id);
  await structuredBackend.write(id, {
    [qualifyIndexField("Book", "rating")]: 99,
  });

  const cleanup = await orm.cleanupOrphanedIndexState("Book", id, {
    structuredVersion: audited?.version,
  });

  return {
    status: cleanup.status,
    newerIndexIds: await queryStructuredIds(
      structuredBackend,
      "Book",
      "rating",
      99,
    ),
  };
};

export const runHealthBoundedContinuationScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "BoundedBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `bounded-${++counter}`,
  });
  const fullTextBackend = new FullTextMemoryBackend();
  const structuredBackend = new StructuredInMemoryBackend();
  const orm = createOrm(
    getBookTypeInfoV1(),
    { Book: driver },
    fullTextBackend,
    structuredBackend,
  );

  for (let index = 0; index < 3; index += 1) {
    const id = await orm.create("Book", {
      title: `Bounded ${index}`,
      slug: `bounded-${index}`,
      rating: index,
    } as TypeInfoDataItem);
    await driver.deleteItem(id);
  }

  const monitor = new TypeInfoORMHealthMonitor({
    orm,
    store: createHealthStore(),
    maxIndexDocumentsPerRun: 1,
    indexPageSize: 1,
  });
  const examinedCounts: number[] = [];
  let completed = false;

  for (let runIndex = 0; runIndex < 20; runIndex += 1) {
    const result = await monitor.preview();
    examinedCounts.push(result.examinedCount);
    if (!result.continuation) {
      completed = true;
      break;
    }
  }

  return {
    completed,
    usedMultipleRuns: examinedCounts.length > 1,
    stayedWithinBudget: examinedCounts.every((count) => count <= 1),
  };
};

export const runHealthSchemaDriftScenario = async () => {
  let bookCounter = 0;
  let legacyCounter = 0;
  const bookDriver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "SchemaBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `schema-book-${++bookCounter}`,
  });
  const legacyDriver = new InMemoryDataItemDBDriver<Legacy, "id">({
    tableName: "Legacy",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `legacy-${++legacyCounter}`,
  });
  const drivers = {
    Book: bookDriver as DataItemDBDriver<any, any>,
    Legacy: legacyDriver as DataItemDBDriver<any, any>,
  };
  const fullTextBackend = new FullTextMemoryBackend();
  const structuredBackend = new StructuredInMemoryBackend();
  const store = createHealthStore();
  const v1Map = mergeTypeInfoMaps(getBookTypeInfoV1(), getLegacyTypeInfo());
  const ormV1 = createOrm(
    v1Map,
    drivers,
    fullTextBackend,
    structuredBackend,
  );
  const bookId = await ormV1.create("Book", {
    title: "Old Title",
    slug: "new-slug",
    rating: 5,
  } as TypeInfoDataItem);
  const legacyId = await ormV1.create("Legacy", {
    label: "Legacy Label",
    rank: 4,
  } as TypeInfoDataItem);

  await new TypeInfoORMHealthMonitor({ orm: ormV1, store }).preview();

  const ormV2 = createOrm(
    getBookTypeInfoV2(),
    drivers,
    fullTextBackend,
    structuredBackend,
  );
  const monitorV2 = new TypeInfoORMHealthMonitor({
    orm: ormV2,
    store,
    maxIndexDocumentsPerRun: 50,
    maxSchemaItemsPerRun: 50,
    maxRepairsPerRun: 50,
  });

  const firstObservation = await monitorV2.preview();
  const repair = await monitorV2.repair();

  const legacyCanonicalStillExists = await legacyDriver.readItem(legacyId);

  return {
    firstObservation: {
      driftCount: firstObservation.schemaDriftFindingCount,
      confirmedCount: firstObservation.confirmedSchemaDriftCount,
    },
    repair: {
      confirmedCount: repair.confirmedSchemaDriftCount,
      reconciledCount: repair.schemaReconciledItemCount,
    },
    bookIndexes: {
      oldTitle: await queryTextIds(
        fullTextBackend,
        "Book",
        "title",
        "Old",
      ),
      newSlug: await queryTextIds(
        fullTextBackend,
        "Book",
        "slug",
        "new",
      ),
      rating: await queryStructuredIds(
        structuredBackend,
        "Book",
        "rating",
        5,
      ),
    },
    removedTypeIndexes: {
      text: await queryTextIds(
        fullTextBackend,
        "Legacy",
        "label",
        "Legacy",
      ),
      structured: await queryStructuredIds(
        structuredBackend,
        "Legacy",
        "rank",
        4,
      ),
    },
    removedTypeCanonicalId: legacyCanonicalStillExists.id,
    bookId,
  };
};

export const runHealthOperationObservationScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "ObservedBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `observed-${++counter}`,
  });
  const observations: Array<{
    operation: string;
    typeName?: string;
    success: boolean;
  }> = [];
  const orm = createOrm(
    getBookTypeInfoV1(),
    { Book: driver },
    new FullTextMemoryBackend(),
    new StructuredInMemoryBackend(),
    (event) => {
      observations.push({
        operation: event.operation,
        typeName: event.typeName,
        success: event.success,
      });
      throw new Error("observability must be isolated");
    },
  );

  const id = await orm.create("Book", {
    title: "Observed",
    slug: "observed",
    rating: 3,
  } as TypeInfoDataItem);
  const item = await orm.read("Book", id);

  return {
    itemId: item.id,
    observations,
  };
};


export const runHealthOperationFindingScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "OperationBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `operation-book-${++counter}`,
  });
  const orm = createOrm(
    getBookTypeInfoV1(),
    { Book: driver },
    new FullTextMemoryBackend(),
    new StructuredInMemoryBackend(),
  );
  const store = createHealthStore();
  const recorder = new TypeInfoORMHealthOperationRecorder({
    store,
    slowOperationMs: 100,
  });

  await recorder.observe({
    operation: "list",
    typeName: "Book",
    startedAt: 10,
    durationMs: 250,
    success: true,
    resultCount: 4,
    queryFingerprint: "book-rating-equals",
  });
  await recorder.observe({
    operation: "list",
    typeName: "Book",
    startedAt: 15,
    durationMs: 300,
    success: true,
    resultCount: 2,
    queryFingerprint: "book-rating-equals",
  });
  await recorder.observe({
    operation: "read",
    typeName: "Book",
    startedAt: 20,
    durationMs: 10,
    success: false,
  });

  const monitor = new TypeInfoORMHealthMonitor({
    orm,
    store,
    maxIndexDocumentsPerRun: 10,
    retentionPageSize: 50,
  });
  const first = await monitor.preview();
  const second = await monitor.preview();
  const records = await store.listRecords({ itemsPerPage: 50 });
  const scopes = records.records
    .filter((record) => record.kind === "finding")
    .map((record) => record.scope)
    .filter((scope): scope is string => !!scope)
    .sort();
  const stats = records.records
    .filter((record) => record.kind === "stats")
    .map((record) => ({
      operation: record.operation,
      count: record.count,
      maxDurationMs: record.data?.maxDurationMs,
      totalDurationMs: record.data?.totalDurationMs,
      failureCount: record.data?.failureCount,
      queryFingerprint: record.data?.queryFingerprint,
    }))
    .sort((left, right) =>
      String(left.operation) < String(right.operation) ? -1 : 1,
    );
  const rawOperationCount = records.records.filter(
    (record) => record.kind === "operation",
  ).length;

  return {
    first: {
      slow: first.slowOperationFindingCount,
      failed: first.failedOperationFindingCount,
      processed: first.operationRecordsProcessedCount,
    },
    second: {
      slow: second.slowOperationFindingCount,
      failed: second.failedOperationFindingCount,
      processed: second.operationRecordsProcessedCount,
    },
    scopes,
    stats,
    rawOperationCount,
  };
};

export const runHealthQueryFingerprintScenario = async () => {
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "FingerprintBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => "unused",
  });
  const fingerprints: string[] = [];
  const orm = createOrm(
    getBookTypeInfoV1(),
    { Book: driver },
    new FullTextMemoryBackend(),
    new StructuredInMemoryBackend(),
    (event) => {
      if (event.queryFingerprint) {
        fingerprints.push(event.queryFingerprint);
      }
    },
  );

  const getCriteria = (value: number) => ({
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "rating",
        operator: ComparisonOperators.EQUALS,
        value,
      },
    ],
  });

  await orm.list("Book", {
    criteria: getCriteria(12345),
    itemsPerPage: 5,
  });
  await orm.list("Book", {
    criteria: getCriteria(67890),
    itemsPerPage: 5,
  });

  return {
    fingerprintCount: fingerprints.length,
    sameShape: fingerprints[0] === fingerprints[1],
    containsFirstValue: fingerprints.some((value) => value.includes("12345")),
    containsSecondValue: fingerprints.some((value) => value.includes("67890")),
  };
};
