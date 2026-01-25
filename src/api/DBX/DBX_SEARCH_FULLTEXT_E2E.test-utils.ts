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

type TextMode = "lossy" | "exact";

type SearchResult = {
  ids: string[];
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
        defaultIndexFieldByType: {
          Post: "body",
        },
      },
    },
  });
};

const buildPosts = (): Array<Omit<Post, "id">> => [
  {
    title: "Sentences",
    body: "Quick brown-fox jumps over 13 lazy dogs.",
    status: "published",
    score: 10,
    createdAt: "2024-04-01T00:00:00.000Z",
    tags: ["sentence", "animals"],
    authorId: "author-1",
  },
  {
    title: "Diacritics",
    body: "Naïve café résumé coöperate São Paulo.",
    status: "published",
    score: 20,
    createdAt: "2024-04-02T00:00:00.000Z",
    tags: ["diacritics"],
    authorId: "author-1",
  },
  {
    title: "Separators",
    body: "snake_case and camelCase and kebab-case and dot.case.",
    status: "draft",
    score: 30,
    createdAt: "2024-04-03T00:00:00.000Z",
    tags: ["separators"],
    authorId: "author-2",
  },
  {
    title: "Addresses",
    body: "Email me at foo.bar@example.com or visit https://example.com/path.",
    status: "draft",
    score: 40,
    createdAt: "2024-04-04T00:00:00.000Z",
    tags: ["links"],
    authorId: "author-2",
  },
  {
    title: "Services",
    body: "Microservices scale; service mesh, service-oriented architecture.",
    status: "published",
    score: 50,
    createdAt: "2024-04-05T00:00:00.000Z",
    tags: ["services"],
    authorId: "author-3",
  },
  {
    title: "Releases",
    body: "Release v2.0 fix #123; O'Reilly media edition.",
    status: "archived",
    score: 60,
    createdAt: "2024-04-06T00:00:00.000Z",
    tags: ["release"],
    authorId: "author-4",
  },
];

const runFullTextSearch = async (
  runtime: ReturnType<typeof buildDbxRuntime>,
  mode: TextMode,
  query: string,
): Promise<SearchResult> => {
  const response = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        itemsPerPage: 10,
        text: {
          query,
          mode,
          indexField: "body",
        },
      },
    ],
  });

  return {
    ids: (response.parsedBody?.items ?? []).map((item) => item.id),
  };
};

/**
 * Run the DBX full-text search E2E scenario against the in-memory router/runtime.
 */
export const runDbxFullTextSearchScenario = async () => {
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

  const exactSentence = await runFullTextSearch(
    runtime,
    "exact",
    "quick brown fox jumps over",
  );
  const exactDiacritics = await runFullTextSearch(
    runtime,
    "exact",
    "naïve café résumé coöperate são paulo",
  );
  const exactSeparators = await runFullTextSearch(
    runtime,
    "exact",
    "snake case and camelcase",
  );
  const exactHyphenated = await runFullTextSearch(
    runtime,
    "exact",
    "service oriented architecture",
  );
  const exactNumeric = await runFullTextSearch(
    runtime,
    "exact",
    "v2 0 fix 123",
  );

  const lossyMiddleToken = await runFullTextSearch(runtime, "lossy", "rown");
  const lossyDiacritics = await runFullTextSearch(
    runtime,
    "lossy",
    "resume cafe",
  );
  const lossySeparators = await runFullTextSearch(
    runtime,
    "lossy",
    "dot case",
  );
  const lossyAddress = await runFullTextSearch(
    runtime,
    "lossy",
    "foo bar example",
  );
  const lossyPrefix = await runFullTextSearch(
    runtime,
    "lossy",
    "microserv",
  );
  const lossyShortToken = await runFullTextSearch(runtime, "lossy", "v2");

  return {
    createdPostIds: postIds,
    exactSentenceIds: exactSentence.ids,
    exactDiacriticsIds: exactDiacritics.ids,
    exactSeparatorsIds: exactSeparators.ids,
    exactHyphenatedIds: exactHyphenated.ids,
    exactNumericIds: exactNumeric.ids,
    lossyMiddleTokenIds: lossyMiddleToken.ids,
    lossyDiacriticsIds: lossyDiacritics.ids,
    lossySeparatorsIds: lossySeparators.ids,
    lossyAddressIds: lossyAddress.ids,
    lossyPrefixIds: lossyPrefix.ids,
    lossyShortTokenIds: lossyShortToken.ids,
  };
};
