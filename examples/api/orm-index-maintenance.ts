import {
  InMemoryDataItemDBDriver,
  InMemoryItemRelationshipDBDriver,
  ItemRelationshipInfoIdentifyingKeys,
  StructuredInMemoryBackend,
  FullTextMemoryBackend,
  TypeInfoORMService,
  getTypeInfoORMIndexingConfigFromTypeInfoMap,
  rebuildStructuredOccupancy,
} from "@resistdesign/voltra/api";
import type { TypeInfoMap } from "@resistdesign/voltra/common";

type Book = {
  id: string;
  title: string;
  slug: string;
  rating: number;
};

const currentTypeInfoMap: TypeInfoMap = {
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
        tags: { indexed: { structured: true } },
        optional: false,
      },
      slug: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          indexed: {
            fullText: true,
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
            structured: true,
          },
        },
      },
    },
  },
};

const previousTypeInfoMap: TypeInfoMap = {
  ...currentTypeInfoMap,
  Book: {
    ...currentTypeInfoMap.Book,
    fields: {
      ...currentTypeInfoMap.Book.fields,
      title: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: {
          indexed: {
            fullText: true,
          },
        },
      },
      slug: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
      },
    },
  },
};

const fullTextBackend = new FullTextMemoryBackend();
const structuredBackend = new StructuredInMemoryBackend();
let bookCounter = 0;

const driver = new InMemoryDataItemDBDriver<Book, "id">({
  tableName: "Books",
  uniquelyIdentifyingFieldName: "id",
  generateUniqueIdentifier: () => `book-${++bookCounter}`,
});

const orm = new TypeInfoORMService({
  typeInfoMap: currentTypeInfoMap,
  getDriver: () => driver,
  getRelationshipDriver: () =>
    new InMemoryItemRelationshipDBDriver({
      tableName: "Relationships",
      uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
    }),
  indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(currentTypeInfoMap, {
    fullText: {
      backend: fullTextBackend,
    },
    structured: {
      reader: structuredBackend,
      writer: structuredBackend,
    },
  }),
  useDAC: false,
});

async function runMaintenanceExamples() {
  const createdId = await orm.create("Book", {
    title: "Old Title",
    slug: "old-title",
    rating: 1,
  });

  // Example 1: an out-of-band update changed the stored item without going
  // through the ORM, so reindex the current stored snapshot.
  await driver.updateItem(createdId, {
    title: "New Title",
    slug: "new-title",
    rating: 2,
  });
  await orm.reindexStoredItem("Book", createdId, {
    previousItem: {
      id: createdId,
      title: "Old Title",
      slug: "old-title",
      rating: 1,
    },
  });

  // Example 2: full-text indexing moved from `title` to `slug`. Removing the
  // old tokens requires the previous field list (and optionally prior item snapshots).
  const previousFullTextFields =
    getTypeInfoORMIndexingConfigFromTypeInfoMap(previousTypeInfoMap, {
      fullText: { backend: fullTextBackend },
    }).fullText?.defaultIndexFieldByType?.Book ?? [];

  await orm.reindexStoredType("Book", {
    previousFullTextIndexFields: previousFullTextFields,
    itemsPerPage: 100,
  });

  // Example 3: optionally rebuild Link & Lock occupancy for repair/compaction.
  // Normal CRUD already maintains g1. Reusing g2 safely resumes this rebuild.
  await rebuildStructuredOccupancy({
    controller: structuredBackend.occupancyMaintenance,
    orm,
    generation: "g2",
    typeNames: ["Book"],
    itemsPerPage: 100,
  });

  // Example 4: an out-of-band delete requires an explicit cleanup snapshot.
  const deletedItemSnapshot = await driver.readItem(createdId);
  await driver.deleteItem(createdId);
  await orm.removeItemIndexes("Book", deletedItemSnapshot, {
    fullTextIndexFields: currentTypeInfoMap.Book.fields?.slug.tags?.indexed
      ?.fullText
      ? ["slug"]
      : [],
  });
}

void runMaintenanceExamples();
