import { searchLossy } from "../Indexing/API";
import { qualifyIndexField } from "../Indexing/fieldQualification";
import { searchStructured } from "../Indexing/structured/SearchStructured";
import { FullTextMemoryBackend } from "../Indexing/fulltext/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import type { DataItemDBDriver } from "./drivers/common/Types";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../common/SearchTypes";
import type {
  TypeInfoDataItem,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "./getTypeInfoORMIndexingConfigFromTypeInfoMap";
import { TypeInfoORMService } from "./TypeInfoORMService";
import { rebuildStructuredOccupancy } from "./rebuildStructuredOccupancy";
import { createIndexBackend } from "../Indexing/query";

type Book = {
  id: string;
  title: string;
  slug: string;
  rating: number;
  summary?: string;
};

const getTypeInfoMapV1 = (): TypeInfoMap => ({
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
        tags: {
          indexed: {
            text: true,
          },
        },
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
        tags: {
          indexed: {
            exact: true,
            range: true,
          },
        },
      },
    },
  },
});

const getTypeInfoMapV2 = (): TypeInfoMap => ({
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
      },
      slug: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          indexed: {
            text: true,
          },
        },
      },
      rating: {
        type: "number",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          indexed: {
            exact: true,
            range: true,
          },
        },
      },
    },
  },
});

const getOptionalFullTextTypeInfoMap = (): TypeInfoMap => ({
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
      },
      summary: {
        type: "string",
        array: false,
        readonly: false,
        optional: true,
        tags: {
          indexed: {
            text: true,
          },
        },
      },
    },
  },
});

const createOrm = (
  typeInfoMap: TypeInfoMap,
  driver: InMemoryDataItemDBDriver<Book, "id">,
  fullTextBackend: FullTextMemoryBackend,
  structuredBackend: StructuredInMemoryBackend,
) =>
  new TypeInfoORMService({
    typeInfoMap,
    getDriver: () => driver as DataItemDBDriver<any, any>,
    getRelationshipDriver: () =>
      new InMemoryItemRelationshipDBDriver({
        tableName: "Relationships",
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
    useDAC: false,
  });

const queryLossyIds = async (
  backend: FullTextMemoryBackend,
  typeName: string,
  fieldName: string,
  query: string,
) =>
  (
    await searchLossy({
      backend,
      query,
      indexField: qualifyIndexField(typeName, fieldName),
      limit: 10,
    })
  ).docIds;

const queryStructuredIds = async (
  backend: StructuredInMemoryBackend,
  typeName: string,
  fieldName: string,
  value: string | number | boolean | null,
) =>
  (
    await searchStructured(
      backend,
      {
        type: "term",
        field: qualifyIndexField(typeName, fieldName),
        mode: "eq",
        value,
      },
      { limit: 10 },
    )
  ).candidateIds;

const runIndexMaintenanceScenario = async () => {
  let counter = 0;
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "Books",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `book-${++counter}`,
  });
  const fullTextBackend = new FullTextMemoryBackend();
  const structuredBackend = new StructuredInMemoryBackend();
  const ormV1 = createOrm(
    getTypeInfoMapV1(),
    driver,
    fullTextBackend,
    structuredBackend,
  );

  const bookId = await ormV1.create("Book", {
    title: "Alpha One",
    slug: "alpha-one",
    rating: 1,
  } as TypeInfoDataItem);

  const initialSnapshot = await driver.readItem(bookId);

  await driver.updateItem(bookId, {
    title: "Beta Two",
    slug: "beta-two",
    rating: 2,
  });

  const staleListBeforeRepair = await ormV1.list("Book", {
    itemsPerPage: 10,
    criteria: {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "title",
          operator: ComparisonOperators.CONTAINS,
          value: "Alpha",
        },
      ],
    },
  });

  const staleFullTextIdsBeforeRepair = await queryLossyIds(
    fullTextBackend,
    "Book",
    "title",
    "Alpha",
  );
  const staleStructuredIdsBeforeRepair = await queryStructuredIds(
    structuredBackend,
    "Book",
    "rating",
    1,
  );

  await ormV1.reindexStoredItem("Book", bookId, {
    previousItem: initialSnapshot,
  });

  const fullTextIdsAfterRepair = {
    titleAlpha: await queryLossyIds(fullTextBackend, "Book", "title", "Alpha"),
    titleBeta: await queryLossyIds(fullTextBackend, "Book", "title", "Beta"),
  };
  const structuredIdsAfterRepair = {
    rating1: await queryStructuredIds(structuredBackend, "Book", "rating", 1),
    rating2: await queryStructuredIds(structuredBackend, "Book", "rating", 2),
  };

  const ormV2 = createOrm(
    getTypeInfoMapV2(),
    driver,
    fullTextBackend,
    structuredBackend,
  );

  await ormV2.reindexStoredItem("Book", bookId, {
    previousIndexFields: ["title"],
  });

  const fullTextIdsAfterSchemaChange = {
    titleBeta: await queryLossyIds(fullTextBackend, "Book", "title", "Beta"),
    slugBeta: await queryLossyIds(fullTextBackend, "Book", "slug", "beta"),
  };

  const beforeDeleteSnapshot = await driver.readItem(bookId);
  await driver.deleteItem(bookId);
  await ormV2.removeItemIndexes("Book", beforeDeleteSnapshot, {
    indexFields: ["slug"],
  });

  const fullTextIdsAfterDeleteCleanup = await queryLossyIds(
    fullTextBackend,
    "Book",
    "slug",
    "beta",
  );
  const structuredIdsAfterDeleteCleanup = await queryStructuredIds(
    structuredBackend,
    "Book",
    "rating",
    2,
  );

  const bulkDriver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "BulkBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `bulk-${++counter}`,
  });
  const bulkFullTextBackend = new FullTextMemoryBackend();
  const bulkStructuredBackend = new StructuredInMemoryBackend();
  const bulkOrmV1 = createOrm(
    getTypeInfoMapV1(),
    bulkDriver,
    bulkFullTextBackend,
    bulkStructuredBackend,
  );
  const bulkOneId = await bulkOrmV1.create("Book", {
    title: "Gamma One",
    slug: "gamma-one",
    rating: 1,
  } as TypeInfoDataItem);
  const bulkTwoId = await bulkOrmV1.create("Book", {
    title: "Delta One",
    slug: "delta-one",
    rating: 1,
  } as TypeInfoDataItem);

  const bulkPreviousItemsByPrimaryField = {
    [bulkOneId]: await bulkDriver.readItem(bulkOneId),
    [bulkTwoId]: await bulkDriver.readItem(bulkTwoId),
  };

  await bulkDriver.updateItem(bulkOneId, {
    title: "Gamma Two",
    slug: "gamma-two",
    rating: 2,
  });
  await bulkDriver.updateItem(bulkTwoId, {
    title: "Delta Two",
    slug: "delta-two",
    rating: 2,
  });

  const bulkOrmV2 = createOrm(
    getTypeInfoMapV2(),
    bulkDriver,
    bulkFullTextBackend,
    bulkStructuredBackend,
  );
  const bulkReindexResults = await bulkOrmV2.reindexStoredType("Book", {
    itemsPerPage: 1,
    previousItemsByPrimaryField: bulkPreviousItemsByPrimaryField,
    previousIndexFields: ["title"],
  });

  const optionalDriver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "OptionalBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `optional-${++counter}`,
  });
  const optionalFullTextBackend = new FullTextMemoryBackend();
  const optionalStructuredBackend = new StructuredInMemoryBackend();
  const optionalOrm = createOrm(
    getOptionalFullTextTypeInfoMap(),
    optionalDriver,
    optionalFullTextBackend,
    optionalStructuredBackend,
  );
  const optionalBookInput = {
    title: "No Summary Yet",
    slug: "no-summary-yet",
    rating: 4,
  } as TypeInfoDataItem;
  const optionalBookId = await optionalOrm.create("Book", optionalBookInput);

  const optionalSummaryIdsAfterCreate = await queryLossyIds(
    optionalFullTextBackend,
    "Book",
    "summary",
    "summary",
  );

  await optionalOrm.removeItemIndexes("Book", {
    id: optionalBookId,
    ...optionalBookInput,
  });

  const optionalSummaryIdsAfterRemoveMissing = await queryLossyIds(
    optionalFullTextBackend,
    "Book",
    "summary",
    "summary",
  );

  await optionalOrm.update("Book", {
    id: optionalBookId,
    summary: "Summary Added Later",
  } as TypeInfoDataItem);

  const optionalUpdatedItem = await optionalDriver.readItem(optionalBookId);
  const optionalSummaryIdsAfterReplaceMissing = await queryLossyIds(
    optionalFullTextBackend,
    "Book",
    "summary",
    "summary",
  );

  return {
    staleListBeforeRepairIds: staleListBeforeRepair.items.map(
      (item) => item.id,
    ),
    staleFullTextIdsBeforeRepair,
    staleStructuredIdsBeforeRepair,
    fullTextIdsAfterRepair,
    structuredIdsAfterRepair,
    fullTextIdsAfterSchemaChange,
    fullTextIdsAfterDeleteCleanup,
    structuredIdsAfterDeleteCleanup,
    bulkReindexResults,
    bulkSlugIdsAfterReindex: {
      gamma: await queryLossyIds(bulkFullTextBackend, "Book", "slug", "gamma"),
      delta: await queryLossyIds(bulkFullTextBackend, "Book", "slug", "delta"),
    },
    bulkTitleIdsAfterReindex: {
      gamma: await queryLossyIds(bulkFullTextBackend, "Book", "title", "Gamma"),
      delta: await queryLossyIds(bulkFullTextBackend, "Book", "title", "Delta"),
    },
    optionalMissingFieldHandling: {
      createdId: optionalBookId,
      summaryIdsAfterCreate: optionalSummaryIdsAfterCreate,
      summaryIdsAfterRemoveMissing: optionalSummaryIdsAfterRemoveMissing,
      summaryIdsAfterReplaceMissing: optionalSummaryIdsAfterReplaceMissing,
      updatedSummary: optionalUpdatedItem.summary,
    },
  };
};

export const runTypeInfoORMIndexMaintenanceScenario = async () =>
  runIndexMaintenanceScenario();

export const runStructuredOccupancyRebuildWorkflowScenario = async () => {
  let counter = 0;
  const typeInfoMap: TypeInfoMap = {
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
          tags: { indexed: { exact: true, range: true } },
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
  };
  const driver = new InMemoryDataItemDBDriver<Book, "id">({
    tableName: "OccupancyBooks",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => `occupancy-${++counter}`,
  });
  const structuredBackend = new StructuredInMemoryBackend();
  const orm = createOrm(
    typeInfoMap,
    driver,
    new FullTextMemoryBackend(),
    structuredBackend,
  );
  await orm.create("Book", {
    title: "Zoe",
    rating: 2,
  } as TypeInfoDataItem);
  await orm.create("Book", {
    title: "Amy",
    rating: 1,
  } as TypeInfoDataItem);

  const ratingField = qualifyIndexField("Book", "rating");
  const titleField = qualifyIndexField("Book", "title");
  const where = {
    type: "between" as const,
    field: ratingField,
    lower: 1,
    upper: 2,
  };
  const options = {
    limit: 10,
    orderBy: { field: titleField },
    occupancyFields: {
      [ratingField]: { type: "number" as const },
      [titleField]: { type: "string" as const },
    },
  };
  const before = await searchStructured(structuredBackend, where, options);
  const rebuilt = await rebuildStructuredOccupancy({
    controller: structuredBackend.occupancyMaintenance,
    orm,
    generation: "g2",
    typeNames: ["Book", "Book"],
    itemsPerPage: 1,
  });
  const after = await searchStructured(structuredBackend, where, options);
  const repeated = await rebuildStructuredOccupancy({
    controller: structuredBackend.occupancyMaintenance,
    orm,
    generation: "g2",
    typeNames: ["Book"],
  });
  let emptyScopeError: string | undefined;
  try {
    await rebuildStructuredOccupancy({
      controller: structuredBackend.occupancyMaintenance,
      orm,
      generation: "g2",
      typeNames: [],
    });
  } catch (error) {
    emptyScopeError = error instanceof Error ? error.message : String(error);
  }

  return {
    beforeStrategy: before.diagnostics?.strategy,
    rebuilt,
    afterStrategy: after.diagnostics?.strategy,
    afterIds: after.candidateIds,
    repeated,
    state: await structuredBackend.occupancyMaintenance.getState(),
    emptyScopeError,
  };
};
