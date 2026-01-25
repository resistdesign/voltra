import type {
  ListItemsResults,
  SearchCriteria,
} from "../../common/SearchTypes";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../common/SearchTypes";
import {
  assertDbxPagingInvariants,
  assertDbxStableOrdering,
} from "./DBXAsserts";
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

type TimingBucket = "fast" | "slow";

const DATASET_SIZE = 50;
const ITEMS_PER_PAGE = 20;
const TIMING_BUCKET_MAX_MS = 10000;

const buildDbxRuntime = () => {
  let postCounter = 0;

  return createDbxRuntime({
    typeInfoMap: DBX_TYPE_INFO_MAP,
    idGeneratorsByType: {
      Post: () => `post-${++postCounter}`,
    },
  });
};

const buildStatus = (index: number): Post["status"] => {
  const remainder = index % 3;
  if (remainder === 1) {
    return "draft";
  }
  if (remainder === 2) {
    return "published";
  }
  return "archived";
};

const buildCreatedAt = (index: number): string => {
  const date = new Date(Date.UTC(2024, 0, 1));
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString();
};

const buildScalePosts = (count: number): Array<Omit<Post, "id">> => {
  const posts: Array<Omit<Post, "id">> = [];

  for (let i = 1; i <= count; i += 1) {
    const status = buildStatus(i);
    const tags = i % 2 === 0 ? ["even", "scale"] : ["odd", "scale"];

    posts.push({
      title: `Scale Post ${i}`,
      body: `Scale body ${i} with token ${status}`,
      status,
      score: i * 2,
      createdAt: buildCreatedAt(i),
      tags,
      authorId: `author-${((i - 1) % 5) + 1}`,
    });
  }

  return posts;
};

const buildPublishedCriteria = (): SearchCriteria => ({
  logicalOperator: LogicalOperators.AND,
  fieldCriteria: [
    {
      fieldName: "status",
      operator: ComparisonOperators.EQUALS,
      value: "published",
    },
  ],
});

const listIds = (items?: Post[]) =>
  (items ?? []).map((item) => item.id);

const buildTimingBucket = (ms: number): TimingBucket =>
  ms <= TIMING_BUCKET_MAX_MS ? "fast" : "slow";

const buildStatusCounts = (posts: Array<Omit<Post, "id">>): StatusCounts => {
  const counts: StatusCounts = {
    draft: 0,
    published: 0,
    archived: 0,
  };

  for (const post of posts) {
    counts[post.status] += 1;
  }

  return counts;
};

const sampleEdges = (ids: string[], sampleSize = 5) => ({
  first: ids.slice(0, sampleSize),
  last: ids.slice(-sampleSize),
});

/**
 * Run the DBX scale/perf E2E scenario against the in-memory router/runtime.
 */
export const runDbxScaleScenario = async () => {
  const runtime = buildDbxRuntime();
  const posts = buildScalePosts(DATASET_SIZE);
  const statusCounts = buildStatusCounts(posts);
  const createdIds: string[] = [];

  const createStart = Date.now();
  for (const post of posts) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Post", post],
    });
    createdIds.push(response.parsedBody as string);
  }
  const createBucket = buildTimingBucket(Date.now() - createStart);

  const listConfig = {
    itemsPerPage: ITEMS_PER_PAGE,
    sortFields: [{ field: "score" }],
  };

  const listStart = Date.now();
  const listPage1 = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: ["Post", listConfig],
  });
  const listPage2 = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        ...listConfig,
        cursor: listPage1.parsedBody?.cursor,
      },
    ],
  });
  const listPage3 = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        ...listConfig,
        cursor: listPage2.parsedBody?.cursor,
      },
    ],
  });
  const listBucket = buildTimingBucket(Date.now() - listStart);

  const pages = [
    listPage1.parsedBody as ListItemsResults<Post>,
    listPage2.parsedBody as ListItemsResults<Post>,
    listPage3.parsedBody as ListItemsResults<Post>,
  ];

  const paging = assertDbxPagingInvariants(pages, {
    itemsPerPage: ITEMS_PER_PAGE,
  });
  const ordering = assertDbxStableOrdering(pages, createdIds);

  const searchStart = Date.now();
  const publishedResponse = await runDbxRequest<ListItemsResults<Post>>(
    runtime,
    {
      method: "POST",
      path: "list",
      args: [
        "Post",
        {
          itemsPerPage: 100,
          sortFields: [{ field: "score" }],
          criteria: buildPublishedCriteria(),
        },
      ],
    },
  );
  const searchBucket = buildTimingBucket(Date.now() - searchStart);

  const publishedIds = listIds(publishedResponse.parsedBody?.items as Post[]);
  const publishedSample = sampleEdges(publishedIds, 5);

  const pagingTranscript = paging.transcript;
  const firstIdsByPage = pagingTranscript.idsByPage.map(
    (ids) => ids[0] ?? null,
  );
  const lastIdsByPage = pagingTranscript.idsByPage.map(
    (ids) => ids[ids.length - 1] ?? null,
  );

  return {
    dataset: {
      size: DATASET_SIZE,
      statusCounts,
    },
    createSummary: {
      count: createdIds.length,
      firstId: createdIds[0],
      lastId: createdIds[createdIds.length - 1],
    },
    paging: {
      ok: paging.ok,
      totalItems: paging.totalItems,
      uniqueItems: paging.uniqueItems,
      emptyPageIndexes: paging.emptyPageIndexes,
      pageSizeViolations: paging.pageSizeViolations,
      pageCount: pagingTranscript.pageCount,
      cursors: pagingTranscript.cursors.map((cursor) => cursor ?? null),
      firstIdsByPage,
      lastIdsByPage,
    },
    ordering: {
      ok: ordering.ok,
      mismatchIndex: ordering.mismatchIndex ?? null,
      firstIds: ordering.actualIds.slice(0, 3),
      lastIds: ordering.actualIds.slice(-3),
    },
    search: {
      criteria: "status=published",
      total: publishedIds.length,
      firstIds: publishedSample.first,
      lastIds: publishedSample.last,
    },
    timingBuckets: {
      create: createBucket,
      list: listBucket,
      search: searchBucket,
    },
  };
};
