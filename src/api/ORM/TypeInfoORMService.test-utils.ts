import { TypeInfoORMService } from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import {
  ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
  OperationGroup,
  RelationshipOperation,
  TypeInfoORMServiceError,
} from "../../common/TypeInfoORM";
import type { LiteralValue, TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import { TypeOperation } from "../../common/TypeParsing/TypeInfo";
import type { ListItemsConfig } from "../../common/SearchTypes";
import type { DataItemDBDriver } from "./drivers/common/Types";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";
import {
  DACConstraintType,
  DACRole,
  WILDCARD_SIGNIFIER_PROTOTYPE,
} from "../DataAccessControl";

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
  const {
    toTypePrimaryFieldValue: _omittedToTypePrimaryFieldValue,
    ...relationshipOriginItem
  } = relationshipItemBase;
  await orm.createRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId1,
  });
  await orm.createRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId2,
  });

  const listRelationships = await orm.listRelationships({
    relationshipItemOrigin: relationshipOriginItem,
    itemsPerPage: 10,
  });

  const relatedItems = await orm.listRelatedItems(
    {
      relationshipItemOrigin: relationshipOriginItem,
      itemsPerPage: 10,
    },
    ["title"],
  );

  const deleteRelationshipResult = await orm.deleteRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId1,
  });
  const relationshipsAfterDelete = await orm.listRelationships({
    relationshipItemOrigin: relationshipOriginItem,
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

export const runTypeInfoORMServiceDACScenario = async () => {
  const { drivers, relationshipDriver } = buildDrivers();
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;

  const accessRole: DACRole = {
    id: "dac-role",
    constraints: [
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          OperationGroup.ALL_OPERATIONS,
          "Author",
          wildcard,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: ["ORM", OperationGroup.ALL_OPERATIONS, "Book", wildcard],
      },
      {
        type: DACConstraintType.DENY,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          TypeOperation.READ,
          "Author",
          wildcard,
          "name",
          wildcard,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "REL",
          OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
          ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
          "Author",
          "books",
          wildcard,
          wildcard,
        ],
      },
      {
        type: DACConstraintType.DENY,
        pathIsPrefix: true,
        resourcePath: [
          "REL",
          RelationshipOperation.UNSET,
          ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
          "Author",
          "books",
          wildcard,
          wildcard,
        ],
      },
    ],
  };

  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: (typeName) =>
      drivers[typeName as keyof typeof drivers] as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => relationshipDriver,
    useDAC: true,
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      accessingRole: accessRole,
      getDACRoleById: async () => accessRole,
    },
  });

  const bookId1 = "book-1";
  const bookId2 = "book-2";
  const authorId = "author-1";

  const seedBook1 = await orm.update("Book", { id: bookId1, title: "Alpha" });
  const seedBook2 = await orm.update("Book", { id: bookId2, title: "Beta" });
  const seedAuthor = await orm.update("Author", {
    id: authorId,
    name: "Alice",
  });

  const readAuthorSelected = await orm.read("Author", authorId, ["name"]);

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
  const {
    toTypePrimaryFieldValue: _omittedToTypePrimaryFieldValue,
    ...relationshipOriginItem
  } = relationshipItemBase;
  await orm.createRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId1,
  });
  await orm.createRelationship({
    ...relationshipItemBase,
    toTypePrimaryFieldValue: bookId2,
  });

  const listRelationships = await orm.listRelationships({
    relationshipItemOrigin: relationshipOriginItem,
    itemsPerPage: 10,
  });

  const relatedItems = await orm.listRelatedItems(
    {
      relationshipItemOrigin: relationshipOriginItem,
      itemsPerPage: 10,
    },
    ["title"],
  );

  let deleteRelationshipError: string | undefined;
  try {
    await orm.deleteRelationship({
      ...relationshipItemBase,
      toTypePrimaryFieldValue: bookId1,
    });
  } catch (error: any) {
    deleteRelationshipError = error?.message ?? String(error);
  }

  return {
    createdIds: {
      bookId1,
      bookId2,
      authorId,
    },
    seedResults: {
      seedBook1,
      seedBook2,
      seedAuthor,
    },
    readAuthorSelected,
    listBookIds: listBooks.items.map((item) => item.id),
    listBookTitles: listBooks.items.map((item) => item.title),
    relationshipTargets: listRelationships.items.map(
      (item) => item.toTypePrimaryFieldValue,
    ),
    relatedItemTitles: relatedItems.items.map((item) => item.title),
    deleteRelationshipError,
    deleteRelationshipErrorExpected: TypeInfoORMServiceError.INVALID_OPERATION,
  };
};

export const runTypeInfoORMServiceContextScenario = async () => {
  const { drivers, relationshipDriver } = buildDrivers();
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
  const roleAllow: DACRole = {
    id: "role-allow",
    constraints: [
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          OperationGroup.ALL_OPERATIONS,
          "Author",
          wildcard,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: ["ORM", OperationGroup.ALL_OPERATIONS, "Book", wildcard],
      },
    ],
  };

  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: (typeName) =>
      drivers[typeName as keyof typeof drivers] as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => relationshipDriver,
    useDAC: true,
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      accessingRole: { id: "unused", constraints: [] },
      getDACRoleById: async () => roleAllow,
    },
  });

  const context = { accessingRoleId: "role-allow" };
  const bookId = "book-1";
  const authorId = "author-1";
  const seedBook = await orm.update(
    "Book",
    { id: bookId, title: "Alpha" },
    context,
  );
  const seedAuthor = await orm.update(
    "Author",
    { id: authorId, name: "Alice" },
    context,
  );

  const readAuthorSelected = await orm.read(
    "Author",
    authorId,
    ["name"],
    context,
  );
  const listBooks = await orm.list(
    "Book",
    {
      itemsPerPage: 10,
      sortFields: [{ field: "title" }],
    },
    ["id", "title"],
    context,
  );

  return {
    seedResults: {
      seedBook,
      seedAuthor,
    },
    readAuthorSelected,
    listBookIds: listBooks.items.map((item) => item.id),
    listBookTitles: listBooks.items.map((item) => item.title),
  };
};

export const runTypeInfoORMServiceOwnerPrefixScenario = async () => {
  const { drivers, relationshipDriver } = buildDrivers();
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
  const roleAllow: DACRole = {
    id: "role-owner-allow",
    constraints: [
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          "own",
          "user-1",
          OperationGroup.ALL_OPERATIONS,
          "Author",
          wildcard,
        ],
      },
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          "own",
          "user-1",
          OperationGroup.ALL_OPERATIONS,
          "Book",
          wildcard,
        ],
      },
    ],
  };

  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: (typeName) =>
      drivers[typeName as keyof typeof drivers] as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => relationshipDriver,
    useDAC: true,
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      accessingRole: { id: "unused", constraints: [] },
      getDACRoleById: async () => roleAllow,
      getOwnerPrefix: async () => ["own", "user-1"],
    },
  });

  const context = { accessingRoleId: "role-owner-allow" };
  const authorId = "author-1";
  const bookId1 = "book-1";
  const bookId2 = "book-2";
  await orm.update("Author", { id: authorId, name: "Alice" }, context);
  await orm.update("Book", { id: bookId1, title: "Alpha" }, context);
  await orm.update("Book", { id: bookId2, title: "Beta" }, context);

  const readAuthorSelected = await orm.read(
    "Author",
    authorId,
    ["name"],
    context,
  );
  const listBooks = await orm.list(
    "Book",
    {
      itemsPerPage: 10,
      sortFields: [{ field: "title" }],
    },
    ["id", "title"],
    context,
  );

  return {
    readAuthorSelected,
    listBookIds: listBooks.items.map((item) => item.id),
    listBookTitles: listBooks.items.map((item) => item.title),
  };
};

export const runTypeInfoORMServiceOwnerPrefixDenyScenario = async () => {
  const { drivers, relationshipDriver } = buildDrivers();
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
  const roleDenyRead: DACRole = {
    id: "role-owner-deny",
    constraints: [
      {
        type: DACConstraintType.ALLOW,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          "own",
          "user-1",
          OperationGroup.ALL_OPERATIONS,
          "Book",
          wildcard,
        ],
      },
      {
        type: DACConstraintType.DENY,
        pathIsPrefix: true,
        resourcePath: [
          "ORM",
          "own",
          "user-1",
          TypeOperation.READ,
          "Book",
          "book-1",
        ],
      },
    ],
  };

  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: (typeName) =>
      drivers[typeName as keyof typeof drivers] as DataItemDBDriver<any, any>,
    getRelationshipDriver: () => relationshipDriver,
    useDAC: true,
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      accessingRole: { id: "unused", constraints: [] },
      getDACRoleById: async () => roleDenyRead,
      getOwnerPrefix: async () => ["own", "user-1"],
    },
  });

  const context = { accessingRoleId: "role-owner-deny" };
  await orm.update("Book", { id: "book-1", title: "Alpha" }, context);

  let readError: string | undefined;
  try {
    await orm.read("Book", "book-1", ["title"], context);
  } catch (error: any) {
    readError = error?.message ?? String(error);
  }

  return {
    readError,
    readErrorExpected: TypeInfoORMServiceError.INVALID_OPERATION,
  };
};

export const runTypeInfoORMServiceRelationshipGateScenario = async () => {
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
  const relationshipItem = {
    fromTypeName: "Author",
    fromTypeFieldName: "books",
    fromTypePrimaryFieldValue: "author-1",
    toTypePrimaryFieldValue: "book-1",
  };

  const buildOwnerPrefix = (typeName: string, id: string) => [
    "own",
    `${typeName}:${id}`,
  ];
  const relationshipAllowBase = {
    type: DACConstraintType.ALLOW,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };
  const relationshipAllowAllOperationsBase = {
    type: DACConstraintType.ALLOW,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      OperationGroup.ALL_OPERATIONS,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };
  const relationshipDenySet = {
    type: DACConstraintType.DENY,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      RelationshipOperation.SET,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };
  const fromOwnerAllow = {
    type: DACConstraintType.ALLOW,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      ...buildOwnerPrefix("Author", "author-1"),
      OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };
  const fromOwnerAllowAllOperations = {
    type: DACConstraintType.ALLOW,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      ...buildOwnerPrefix("Author", "author-1"),
      OperationGroup.ALL_OPERATIONS,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };
  const toOwnerAllow = {
    type: DACConstraintType.ALLOW,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      ...buildOwnerPrefix("Book", "book-1"),
      OperationGroup.ALL_RELATIONSHIP_OPERATIONS,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };
  const toOwnerAllowAllOperations = {
    type: DACConstraintType.ALLOW,
    pathIsPrefix: true,
    resourcePath: [
      "REL",
      ...buildOwnerPrefix("Book", "book-1"),
      OperationGroup.ALL_OPERATIONS,
      ITEM_RELATIONSHIP_DAC_RESOURCE_NAME,
      "Author",
      "books",
      wildcard,
      wildcard,
    ],
  };

  const rolesById: Record<string, DACRole> = {
    "role-rel-allow-endpoints-deny": {
      id: "role-rel-allow-endpoints-deny",
      constraints: [
        relationshipAllowBase,
        relationshipAllowAllOperationsBase,
        fromOwnerAllow,
        fromOwnerAllowAllOperations,
      ],
    },
    "role-rel-deny-permission": {
      id: "role-rel-deny-permission",
      constraints: [
        relationshipDenySet,
        fromOwnerAllow,
        fromOwnerAllowAllOperations,
        toOwnerAllow,
        toOwnerAllowAllOperations,
      ],
    },
    "role-rel-allow-all": {
      id: "role-rel-allow-all",
      constraints: [
        {
          type: DACConstraintType.ALLOW,
          pathIsPrefix: true,
          resourcePath: [
            "ORM",
            ...buildOwnerPrefix("Author", "author-1"),
            OperationGroup.ALL_OPERATIONS,
            "Author",
            wildcard,
          ],
        },
        {
          type: DACConstraintType.ALLOW,
          pathIsPrefix: true,
          resourcePath: [
            "ORM",
            ...buildOwnerPrefix("Book", "book-1"),
            OperationGroup.ALL_OPERATIONS,
            "Book",
            wildcard,
          ],
        },
        {
          type: DACConstraintType.ALLOW,
          pathIsPrefix: true,
          resourcePath: [
            "ORM",
            OperationGroup.ALL_OPERATIONS,
            "Author",
            wildcard,
          ],
        },
        {
          type: DACConstraintType.ALLOW,
          pathIsPrefix: true,
          resourcePath: [
            "ORM",
            OperationGroup.ALL_OPERATIONS,
            "Book",
            wildcard,
          ],
        },
        relationshipAllowBase,
        relationshipAllowAllOperationsBase,
        fromOwnerAllow,
        fromOwnerAllowAllOperations,
        toOwnerAllow,
        toOwnerAllowAllOperations,
      ],
    },
  };

  const buildOrm = () => {
    const { drivers, relationshipDriver } = buildDrivers();
    return new TypeInfoORMService({
      typeInfoMap,
      getDriver: (typeName) =>
        drivers[typeName as keyof typeof drivers] as DataItemDBDriver<any, any>,
      getRelationshipDriver: () => relationshipDriver,
      useDAC: true,
      dacConfig: {
        itemResourcePathPrefix: ["ORM"],
        relationshipResourcePathPrefix: ["REL"],
        accessingRole: { id: "unused", constraints: [] },
        getDACRoleById: async (id: string) => rolesById[id],
        getOwnerPrefix: async (
          typeName: string,
          primaryFieldValue: LiteralValue,
        ) => buildOwnerPrefix(typeName, String(primaryFieldValue)),
      },
    });
  };

  const orm = buildOrm();
  const seedContext = { accessingRoleId: "role-rel-allow-all" };
  await orm.update("Author", { id: "author-1", name: "Alice" }, seedContext);
  await orm.update("Book", { id: "book-1", title: "Alpha" }, seedContext);

  let endpointDeniedError: string | undefined;
  try {
    await orm.createRelationship(relationshipItem, {
      accessingRoleId: "role-rel-allow-endpoints-deny",
    });
  } catch (error: any) {
    endpointDeniedError = error?.message ?? String(error);
  }

  let permissionDeniedError: string | undefined;
  try {
    await orm.createRelationship(relationshipItem, {
      accessingRoleId: "role-rel-deny-permission",
    });
  } catch (error: any) {
    permissionDeniedError = error?.message ?? String(error);
  }

  let relationshipAllowed: boolean;
  try {
    relationshipAllowed = await orm.createRelationship(relationshipItem, {
      accessingRoleId: "role-rel-allow-all",
    });
  } catch (error: any) {
    throw new Error(
      `relationshipAllowedFailed:${error?.message ?? String(error)}`,
    );
  }

  let relationshipDeleted: { success: boolean; remainingItemsExist: boolean };
  try {
    relationshipDeleted = await orm.deleteRelationship(relationshipItem, {
      accessingRoleId: "role-rel-allow-all",
    });
  } catch (error: any) {
    throw new Error(
      `relationshipDeletedFailed:${error?.message ?? String(error)}`,
    );
  }

  return {
    endpointDeniedError,
    endpointDeniedErrorExpected: TypeInfoORMServiceError.INVALID_OPERATION,
    permissionDeniedError,
    permissionDeniedErrorExpected: TypeInfoORMServiceError.INVALID_OPERATION,
    relationshipAllowed,
    relationshipDeleted,
  };
};
