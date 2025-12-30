import { TypeInfoORMService } from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "./drivers/InMemoryItemRelationshipDBDriver";
import { StructuredInMemoryBackend } from "../Indexing/structured/inMemoryBackend";
import { ComparisonOperators, LogicalOperators } from "../../common/SearchTypes";
import type { TypeInfoMap, TypeInfoDataItem } from "../../common/TypeParsing/TypeInfo";
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
        optional: true,
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

export const runTypeInfoORMStructuredScenario = async () => {
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
  const orm = new TypeInfoORMService({
    typeInfoMap,
    getDriver: () => driver as any,
    getRelationshipDriver: () => relationshipDriver,
    indexing: {
      structured: {
        reader: structuredBackend,
        writer: structuredBackend,
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

  return {
    createdIds: [id1, id2, id3],
    newsIds: news.items.map((item) => item.id),
    tagsBIds: tagsB.items.map((item) => item.id),
    scoreBetweenIds: scoreBetween.items.map((item) => item.id),
    page1Ids: page1.items.map((item) => item.id),
    page2Ids: page2.items.map((item) => item.id),
    afterUpdateIds: afterUpdate.items.map((item) => item.id),
  };
};
