import {
  ComparisonOperators,
  LogicalOperators,
  type ListItemsResults,
} from "../../common/SearchTypes";
import { FullTextMemoryBackend } from "../Indexing";
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
      fullText: {
        backend: new FullTextMemoryBackend(),
        defaultIndexFieldByType: {
          Post: "body",
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
    score: 11,
    createdAt: "2024-02-01T00:00:00.000Z",
    tags: ["alpha", "bravo"],
    authorId: "author-1",
  },
  {
    title: "Bravo",
    body: "alpha bravo delta",
    status: "published",
    score: 22,
    createdAt: "2024-02-02T00:00:00.000Z",
    tags: ["bravo"],
    authorId: "author-1",
  },
  {
    title: "Gamma",
    body: "alpha x bravo",
    status: "draft",
    score: 33,
    createdAt: "2024-02-03T00:00:00.000Z",
    tags: ["gamma"],
    authorId: "author-2",
  },
  {
    title: "Delta",
    body: "bravo alpha",
    status: "archived",
    score: 44,
    createdAt: "2024-02-04T00:00:00.000Z",
    tags: ["delta"],
    authorId: "author-2",
  },
];

const runExactSearch = async (runtime: ReturnType<typeof buildDbxRuntime>) => {
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
              operator: ComparisonOperators.LIKE,
              value: "Alpha Bravo!",
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

const runDbxExactSearchScenario = async () => {
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

  const initialSearch = await runExactSearch(runtime);

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

  const afterUpdateSearch = await runExactSearch(runtime);

  const deleteResult = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "delete",
    args: ["Post", postIds[1]],
  });

  const afterDeleteSearch = await runExactSearch(runtime);

  return {
    createdPostIds: postIds,
    initialSearchIds: initialSearch.ids,
    updateResult: updateResult.parsedBody,
    afterUpdateSearchIds: afterUpdateSearch.ids,
    deleteResult: deleteResult.parsedBody,
    afterDeleteSearchIds: afterDeleteSearch.ids,
  };
};

export const runDbxExactSearchCreatedPostIdsScenario = async () =>
  (await runDbxExactSearchScenario()).createdPostIds;

export const runDbxExactSearchInitialSearchIdsScenario = async () =>
  (await runDbxExactSearchScenario()).initialSearchIds;

export const runDbxExactSearchUpdateResultScenario = async () =>
  (await runDbxExactSearchScenario()).updateResult;

export const runDbxExactSearchAfterUpdateSearchIdsScenario = async () =>
  (await runDbxExactSearchScenario()).afterUpdateSearchIds;

export const runDbxExactSearchDeleteResultScenario = async () =>
  (await runDbxExactSearchScenario()).deleteResult;

export const runDbxExactSearchAfterDeleteSearchIdsScenario = async () =>
  (await runDbxExactSearchScenario()).afterDeleteSearchIds;
