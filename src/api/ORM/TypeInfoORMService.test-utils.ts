import { TypeInfoORMService } from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import { TypeInfoORMServiceError } from "../../common/TypeInfoORM";
import type { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import type { ListItemsConfig } from "../../common/SearchTypes";
import type { DataItemDBDriver } from "./drivers/common/Types";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";

type Author = {
  id: string;
  name: string;
};

type Book = {
  id: string;
  title: string;
};

const typeInfoMap: TypeInfoMap = {
  Author: {
    primaryField: "id",
    fields: {
      id: {
        type: "string",
        array: false,
        readonly: false,
        optional: false,
        tags: { primaryField: true },
      },
      name: { type: "string", array: false, readonly: false, optional: false },
      books: {
        type: "string",
        array: true,
        readonly: false,
        optional: true,
        typeReference: "Book",
      },
    },
  },
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
      title: { type: "string", array: false, readonly: false, optional: false },
    },
  },
};

const buildDrivers = () => {
  let authorCounter = 0;
  let bookCounter = 0;
  const drivers = {
    Author: new InMemoryDataItemDBDriver<Author, "id">({
      tableName: "Authors",
      uniquelyIdentifyingFieldName: "id",
      generateUniqueIdentifier: () => `author-${++authorCounter}`,
    }),
    Book: new InMemoryDataItemDBDriver<Book, "id">({
      tableName: "Books",
      uniquelyIdentifyingFieldName: "id",
      generateUniqueIdentifier: () => `book-${++bookCounter}`,
    }),
  };
  const relationshipDriver = new InMemoryItemRelationshipDBDriver({
    tableName: "Relationships",
    uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
  });

  return { drivers, relationshipDriver };
};

export const runTypeInfoORMServiceScenario = async () => {
  let missingDriverError: string | undefined;
  try {
    new TypeInfoORMService({
      typeInfoMap,
      getDriver: undefined as unknown as (typeName: string) => any,
      getRelationshipDriver: () => {
        throw new Error("unused");
      },
      useDAC: false,
    });
  } catch (error: any) {
    missingDriverError = error?.message ?? String(error);
  }

  let missingRelationshipDriverError: string | undefined;
  try {
    new TypeInfoORMService({
      typeInfoMap,
      getDriver: () => {
        throw new Error("unused");
      },
      useDAC: false,
    });
  } catch (error: any) {
    missingRelationshipDriverError = error?.message ?? String(error);
  }

  const { drivers, relationshipDriver } = buildDrivers();
  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: (typeName) =>
      drivers[typeName as keyof typeof drivers] as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => relationshipDriver,
    useDAC: false,
  });

  const bookId1 = await orm.create("Book", { title: "Alpha" });
  const bookId2 = await orm.create("Book", { title: "Beta" });
  const authorId = await orm.create("Author", { name: "Alice" });

  const readAuthorSelected = await orm.read("Author", authorId, ["name"]);
  await orm.update("Author", { id: authorId, name: "Alice Cooper" });
  const updatedAuthor = await orm.read("Author", authorId);

  const listConfig: ListItemsConfig = {
    itemsPerPage: 10,
    sortFields: [{ field: "title" }],
  };
  const listBooks = await orm.list("Book", listConfig, ["id", "title"]);

  const relationshipItemBase = {
    fromTypeName: "Author",
    fromTypeFieldName: "books",
    fromTypePrimaryFieldValue: authorId,
    toTypePrimaryFieldValue: bookId1,
  };
  await orm.createRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId1,
  });
  await orm.createRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId2,
  });

  const listRelationships = await orm.listRelationships({
    relationshipItemOrigin: relationshipItemBase,
    itemsPerPage: 10,
  });

  const relatedItems = await orm.listRelatedItems(
    {
      relationshipItemOrigin: relationshipItemBase,
      itemsPerPage: 10,
    },
    ["title"],
  );

  const deleteRelationshipResult = await orm.deleteRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId1,
  });
  const relationshipsAfterDelete = await orm.listRelationships({
    relationshipItemOrigin: relationshipItemBase,
    itemsPerPage: 10,
  });

  return {
    missingDriverError,
    missingRelationshipDriverError,
    missingDriverErrorExpected: TypeInfoORMServiceError.NO_DRIVERS_SUPPLIED,
    missingRelationshipDriverErrorExpected:
      TypeInfoORMServiceError.NO_RELATIONSHIP_DRIVERS_SUPPLIED,
    createdIds: {
      bookId1,
      bookId2,
      authorId,
    },
    readAuthorSelected,
    updatedAuthorName: updatedAuthor.name,
    listBookIds: listBooks.items.map((item) => item.id),
    listBookTitles: listBooks.items.map((item) => item.title),
    relationshipTargets: listRelationships.items.map(
      (item) => item.toTypePrimaryFieldValue,
    ),
    relatedItemTitles: relatedItems.items.map((item) => item.title),
    relatedItemIds: relatedItems.items.map((item) => item.id),
    deleteRelationshipResult,
    relationshipsAfterDelete: relationshipsAfterDelete.items.map(
      (item) => item.toTypePrimaryFieldValue,
    ),
  };
};
