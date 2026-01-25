import type { ListItemsResults, SearchCriteria } from "../../common/SearchTypes";
import { ComparisonOperators, LogicalOperators } from "../../common/SearchTypes";
import { runDbxRequest } from "./DBXRequest";
import { createDbxRuntime } from "./DBXRuntime";
import { DBX_TYPE_INFO_MAP } from "./DBXScenarioConfig";

type Post = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  score: number;
  createdAt: string;
  tags?: string[];
  authorId?: string;
};

const buildDbxRuntime = () => {
  let postCounter = 0;

  return createDbxRuntime({
    typeInfoMap: DBX_TYPE_INFO_MAP,
    idGeneratorsByType: {
      Post: () => `post-${++postCounter}`,
    },
  });
};

const buildPosts = (): Array<Omit<Post, "id">> => [
  {
    title: "Alpha",
    body: "Structured Alpha",
    status: "draft",
    score: 12,
    createdAt: "2024-04-01T00:00:00.000Z",
    tags: ["alpha", "news"],
    authorId: "author-1",
  },
  {
    title: "Beta",
    body: "Structured Beta",
    status: "published",
    score: 24,
    createdAt: "2024-04-02T00:00:00.000Z",
    tags: ["beta", "news"],
    authorId: "author-1",
  },
  {
    title: "Gamma",
    body: "Structured Gamma",
    status: "published",
    score: 36,
    createdAt: "2024-04-03T00:00:00.000Z",
    tags: ["alpha", "tech"],
    authorId: "author-2",
  },
  {
    title: "Delta",
    body: "Structured Delta",
    status: "archived",
    score: 48,
    createdAt: "2024-04-04T00:00:00.000Z",
    tags: ["delta"],
    authorId: "author-2",
  },
];

const runStructuredSearch = async (
  runtime: ReturnType<typeof buildDbxRuntime>,
  criteria: SearchCriteria,
  options?: { itemsPerPage?: number; cursor?: string },
) => {
  const response = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        itemsPerPage: options?.itemsPerPage ?? 10,
        cursor: options?.cursor,
        criteria,
      },
    ],
  });

  return response.parsedBody as ListItemsResults<Post>;
};

const listIds = (results?: ListItemsResults<Post>) =>
  (results?.items ?? []).map((item) => item.id);

/**
 * Run the DBX structured search E2E scenario against the in-memory router/runtime.
 */
export const runDbxStructuredSearchScenario = async () => {
  const runtime = buildDbxRuntime();
  const postIds: string[] = [];

  for (const post of buildPosts()) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Post", post],
    });
    postIds.push(response.parsedBody as string);
  }

  const publishedResults = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
    ],
  });

  const alphaTagResults = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
    ],
  });

  const scoreBetweenResults = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [15, 40],
      },
    ],
  });

  const statusInResults = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.IN,
        valueOptions: ["draft", "archived"],
      },
    ],
  });

  const publishedAlphaResults = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
    ],
  });

  const draftOrHighScoreResults = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.OR,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "draft",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 40,
      },
    ],
  });

  const publishedPage1 = await runStructuredSearch(
    runtime,
    {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "status",
          operator: ComparisonOperators.EQUALS,
          value: "published",
        },
      ],
    },
    { itemsPerPage: 1 },
  );

  const publishedPage2 = await runStructuredSearch(
    runtime,
    {
      logicalOperator: LogicalOperators.AND,
      fieldCriteria: [
        {
          fieldName: "status",
          operator: ComparisonOperators.EQUALS,
          value: "published",
        },
      ],
    },
    { itemsPerPage: 1, cursor: publishedPage1.cursor },
  );

  const denseAndPublishedNews = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "news",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [20, 30],
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-02T00:00:00.000Z",
          "2024-04-03T00:00:00.000Z",
        ],
      },
    ],
  });

  const denseAndPublishedAlpha = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-2",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 30,
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.LESS_THAN_OR_EQUAL,
        value: 40,
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-03T00:00:00.000Z",
          "2024-04-04T00:00:00.000Z",
        ],
      },
    ],
  });

  const denseAndContradiction = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 40,
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-01T00:00:00.000Z",
          "2024-04-02T00:00:00.000Z",
        ],
      },
    ],
  });

  const denseOrWide = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.OR,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "archived",
      },
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "draft",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "tech",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 40,
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
    ],
  });

  const denseOrDeltaOnly = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.OR,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "archived",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "delta",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [47, 49],
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-04T00:00:00.000Z",
          "2024-04-04T00:00:00.000Z",
        ],
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Delta",
      },
      {
        fieldName: "body",
        operator: ComparisonOperators.EQUALS,
        value: "Structured Delta",
      },
    ],
  });

  const denseAndWithIn = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.IN,
        valueOptions: ["published", "archived"],
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "news",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 20,
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.LESS_THAN_OR_EQUAL,
        value: 30,
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-01T00:00:00.000Z",
          "2024-04-03T00:00:00.000Z",
        ],
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Beta",
      },
    ],
  });

  const denseAndWithLike = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "title",
        operator: ComparisonOperators.LIKE,
        value: "Al",
      },
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "draft",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [10, 20],
      },
    ],
  });

  const denseOrAlphaGamma = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.OR,
    fieldCriteria: [
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Alpha",
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Gamma",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [10, 15],
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [35, 37],
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-01T00:00:00.000Z",
          "2024-04-01T00:00:00.000Z",
        ],
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-03T00:00:00.000Z",
          "2024-04-03T00:00:00.000Z",
        ],
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "tech",
      },
    ],
  });

  const denseAndAlphaDraft = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "draft",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "alpha",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "news",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 10,
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.LESS_THAN_OR_EQUAL,
        value: 15,
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-01T00:00:00.000Z",
          "2024-04-02T00:00:00.000Z",
        ],
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Alpha",
      },
      {
        fieldName: "body",
        operator: ComparisonOperators.EQUALS,
        value: "Structured Alpha",
      },
    ],
  });

  const denseAndBetaExact = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
      {
        fieldName: "authorId",
        operator: ComparisonOperators.EQUALS,
        value: "author-1",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "news",
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [20, 30],
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.GREATER_THAN_OR_EQUAL,
        value: 24,
      },
      {
        fieldName: "score",
        operator: ComparisonOperators.LESS_THAN_OR_EQUAL,
        value: 24,
      },
      {
        fieldName: "createdAt",
        operator: ComparisonOperators.BETWEEN,
        valueOptions: [
          "2024-04-02T00:00:00.000Z",
          "2024-04-03T00:00:00.000Z",
        ],
      },
      {
        fieldName: "title",
        operator: ComparisonOperators.EQUALS,
        value: "Beta",
      },
      {
        fieldName: "body",
        operator: ComparisonOperators.EQUALS,
        value: "Structured Beta",
      },
      {
        fieldName: "tags",
        operator: ComparisonOperators.CONTAINS,
        value: "beta",
      },
    ],
  });

  const updateResponse = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        id: postIds[0],
        status: "published",
      },
    ],
  });

  const afterUpdatePublished = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
    ],
  });

  const deleteResponse = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "delete",
    args: ["Post", postIds[1]],
  });

  const afterDeletePublished = await runStructuredSearch(runtime, {
    logicalOperator: LogicalOperators.AND,
    fieldCriteria: [
      {
        fieldName: "status",
        operator: ComparisonOperators.EQUALS,
        value: "published",
      },
    ],
  });

  return {
    createdPostIds: postIds,
    publishedIds: listIds(publishedResults),
    alphaTagIds: listIds(alphaTagResults),
    scoreBetweenIds: listIds(scoreBetweenResults),
    statusInIds: listIds(statusInResults),
    publishedAlphaIds: listIds(publishedAlphaResults),
    draftOrHighScoreIds: listIds(draftOrHighScoreResults),
    publishedPage1Ids: listIds(publishedPage1),
    publishedPage2Ids: listIds(publishedPage2),
    denseAndPublishedNewsIds: listIds(denseAndPublishedNews),
    denseAndPublishedAlphaIds: listIds(denseAndPublishedAlpha),
    denseAndContradictionIds: listIds(denseAndContradiction),
    denseOrWideIds: listIds(denseOrWide),
    denseOrDeltaOnlyIds: listIds(denseOrDeltaOnly),
    denseAndWithInIds: listIds(denseAndWithIn),
    denseAndWithLikeIds: listIds(denseAndWithLike),
    denseOrAlphaGammaIds: listIds(denseOrAlphaGamma),
    denseAndAlphaDraftIds: listIds(denseAndAlphaDraft),
    denseAndBetaExactIds: listIds(denseAndBetaExact),
    updateResult: updateResponse.parsedBody,
    afterUpdatePublishedIds: listIds(afterUpdatePublished),
    deleteResult: deleteResponse.parsedBody,
    afterDeletePublishedIds: listIds(afterDeletePublished),
  };
};
