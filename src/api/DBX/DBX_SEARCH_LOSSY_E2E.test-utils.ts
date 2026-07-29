import {
  ComparisonOperators,
  LogicalOperators,
  type ListItemsResults,
} from "../../common/SearchTypes";
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
    indexing: {
      fieldsByType: {
        Post: {
          body: {
            text: {
              exact: true,
              phrase: true,
              caseInsensitiveEquals: true,
              caseInsensitiveContains: true,
              prefix: true,
              lossy: true,
            },
          },
        },
      },
    },
  });
};

const buildPosts = (): Array<Omit<Post, "id">> => [
  {
    title: "Alpha",
    body: "Alpha bravo charlie",
    status: "published",
    score: 12,
    createdAt: "2024-03-01T00:00:00.000Z",
    tags: ["alpha", "bravo"],
    authorId: "author-1",
  },
  {
    title: "Bravo",
    body: "alpha x bravo",
    status: "published",
    score: 24,
    createdAt: "2024-03-02T00:00:00.000Z",
    tags: ["bravo"],
    authorId: "author-1",
  },
  {
    title: "Gamma",
    body: "alpha beta charlie",
    status: "draft",
    score: 36,
    createdAt: "2024-03-03T00:00:00.000Z",
    tags: ["gamma"],
    authorId: "author-2",
  },
  {
    title: "Delta",
    body: "bravo delta echo",
    status: "archived",
    score: 48,
    createdAt: "2024-03-04T00:00:00.000Z",
    tags: ["delta"],
    authorId: "author-2",
  },
];

const runLossySearch = async (runtime: ReturnType<typeof buildDbxRuntime>) => {
  const response = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        itemsPerPage: 10,
        criteria: {
          logicalOperator: LogicalOperators.AND,
          fieldCriteria: [
            {
              fieldName: "body",
              operator: ComparisonOperators.TEXT_LOSSY,
              value: "alpha bravo",
            },
          ],
        },
      },
    ],
  });

  return {
    ids: (response.parsedBody?.items ?? []).map((item) => item.id),
  };
};

const runDbxLossySearchScenario = async () => {
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

  const initialSearch = await runLossySearch(runtime);

  const updateResult = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        id: postIds[2],
        body: "alpha bravo echo",
      },
    ],
  });

  const afterUpdateSearch = await runLossySearch(runtime);

  const deleteResult = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "delete",
    args: ["Post", postIds[0]],
  });

  const afterDeleteSearch = await runLossySearch(runtime);

  return {
    createdPostIds: postIds,
    initialSearchIds: initialSearch.ids,
    updateResult: updateResult.parsedBody,
    afterUpdateSearchIds: afterUpdateSearch.ids,
    deleteResult: deleteResult.parsedBody,
    afterDeleteSearchIds: afterDeleteSearch.ids,
  };
};

export const runDbxLossySearchCreatedPostIdsScenario = async () =>
  (await runDbxLossySearchScenario()).createdPostIds;

export const runDbxLossySearchInitialSearchIdsScenario = async () =>
  (await runDbxLossySearchScenario()).initialSearchIds;

export const runDbxLossySearchUpdateResultScenario = async () =>
  (await runDbxLossySearchScenario()).updateResult;

export const runDbxLossySearchAfterUpdateSearchIdsScenario = async () =>
  (await runDbxLossySearchScenario()).afterUpdateSearchIds;

export const runDbxLossySearchDeleteResultScenario = async () =>
  (await runDbxLossySearchScenario()).deleteResult;

export const runDbxLossySearchAfterDeleteSearchIdsScenario = async () =>
  (await runDbxLossySearchScenario()).afterDeleteSearchIds;
