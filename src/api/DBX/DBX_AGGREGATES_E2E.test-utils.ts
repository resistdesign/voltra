import type { ListItemsResults } from "../../common/SearchTypes";
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

type StatusCounts = Record<Post["status"], number>;

type ScoreTotals = Record<Post["status"], number>;

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
    body: "Aggregate Alpha",
    status: "draft",
    score: 5,
    createdAt: "2024-05-01T00:00:00.000Z",
    tags: ["alpha", "core"],
    authorId: "author-1",
  },
  {
    title: "Bravo",
    body: "Aggregate Bravo",
    status: "published",
    score: 15,
    createdAt: "2024-05-02T00:00:00.000Z",
    tags: ["bravo", "release"],
    authorId: "author-1",
  },
  {
    title: "Charlie",
    body: "Aggregate Charlie",
    status: "published",
    score: 25,
    createdAt: "2024-05-03T00:00:00.000Z",
    tags: ["charlie", "release"],
    authorId: "author-2",
  },
  {
    title: "Delta",
    body: "Aggregate Delta",
    status: "archived",
    score: 35,
    createdAt: "2024-05-04T00:00:00.000Z",
    tags: ["delta"],
    authorId: "author-2",
  },
  {
    title: "Echo",
    body: "Aggregate Echo",
    status: "published",
    score: 45,
    createdAt: "2024-05-05T00:00:00.000Z",
    tags: ["echo", "core"],
    authorId: "author-3",
  },
  {
    title: "Foxtrot",
    body: "Aggregate Foxtrot",
    status: "draft",
    score: 55,
    createdAt: "2024-05-06T00:00:00.000Z",
    tags: ["foxtrot"],
    authorId: "author-3",
  },
];

const roundTo = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const buildAggregateSnapshot = (items: Post[]) => {
  const statusCounts: StatusCounts = {
    draft: 0,
    published: 0,
    archived: 0,
  };
  const scoreTotals: ScoreTotals = {
    draft: 0,
    published: 0,
    archived: 0,
  };

  let totalScore = 0;

  for (const item of items) {
    statusCounts[item.status] += 1;
    scoreTotals[item.status] += item.score;
    totalScore += item.score;
  }

  const totalCount = items.length;
  const averageScore = totalCount
    ? roundTo(totalScore / totalCount, 2)
    : 0;
  const averageScoreByStatus = {
    draft: statusCounts.draft
      ? roundTo(scoreTotals.draft / statusCounts.draft, 2)
      : 0,
    published: statusCounts.published
      ? roundTo(scoreTotals.published / statusCounts.published, 2)
      : 0,
    archived: statusCounts.archived
      ? roundTo(scoreTotals.archived / statusCounts.archived, 2)
      : 0,
  };

  return {
    totalCount,
    statusCounts,
    scoreSum: totalScore,
    scoreByStatus: scoreTotals,
    averageScore,
    averageScoreByStatus,
  };
};

/**
 * Run the DBX aggregates + reports E2E scenario against the in-memory router/runtime.
 */
export const runDbxAggregatesScenario = async () => {
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

  const listResponse = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        itemsPerPage: 20,
        sortFields: [{ field: "score" }],
      },
    ],
  });

  const items = (listResponse.parsedBody?.items ?? []) as Post[];
  const orderedIds = items.map((item) => item.id);
  const aggregates = buildAggregateSnapshot(items);

  return {
    createdPostIds: postIds,
    orderedIds,
    realtimeAggregates: aggregates,
    reportJob: {
      supported: false,
      reason: "REPORT_JOB_API_NOT_IMPLEMENTED",
      requested: {
        reportType: "score-summary",
        groupBy: "status",
      },
      lifecycle: [
        { action: "start", status: "not_supported" },
        { action: "status", status: "not_supported" },
        { action: "cancel", status: "not_supported" },
        { action: "restart", status: "not_supported" },
        { action: "fetch", status: "not_supported" },
      ],
    },
  };
};
