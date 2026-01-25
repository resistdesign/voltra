import type { ListItemsResults } from "../../common/SearchTypes";
import { runDbxRequest } from "./DBXRequest";
import { createDbxRuntime } from "./DBXRuntime";
import { DBX_TYPE_INFO_MAP } from "./DBXScenarioConfig";
import { SEARCH_DEFAULTS } from "../Indexing/Handler/Config";

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

const buildDbxRuntime = (options?: { maxTokens?: number }) => {
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
      limits: options?.maxTokens
        ? {
            ...SEARCH_DEFAULTS,
            maxTokens: options.maxTokens,
          }
        : undefined,
    },
  });
};

const buildPosts = (): Array<Omit<Post, "id">> => [
  {
    title: "Sentences",
    body: "Quick brown-fox jumps over 13 lazy dogs today.",
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
  {
    title: "Aurora",
    body: "Aurora borealis glows above arctic night sky with silent cold light over distant mountains under stars.",
    status: "published",
    score: 70,
    createdAt: "2024-04-07T00:00:00.000Z",
    tags: ["aurora"],
    authorId: "author-5",
  },
  {
    title: "Stopwords",
    body: "the the the quick brown fox.",
    status: "draft",
    score: 80,
    createdAt: "2024-04-08T00:00:00.000Z",
    tags: ["stopwords"],
    authorId: "author-6",
  },
  {
    title: "Case",
    body: "MiXeD CaSe Tokens Keep Showing Up.",
    status: "published",
    score: 90,
    createdAt: "2024-04-09T00:00:00.000Z",
    tags: ["case"],
    authorId: "author-6",
  },
  {
    title: "Punctuation",
    body: "edge...case!!! punctuation--heavy?? yes.",
    status: "archived",
    score: 100,
    createdAt: "2024-04-10T00:00:00.000Z",
    tags: ["punctuation"],
    authorId: "author-7",
  },
  {
    title: "Emoji",
    body: "Data 🚀 rocket ships launch; emoji should not break tokens.",
    status: "published",
    score: 110,
    createdAt: "2024-04-11T00:00:00.000Z",
    tags: ["emoji"],
    authorId: "author-8",
  },
  {
    title: "Quotes",
    body: "\"Quoted phrase\" appears with quotes and ‘smart’ apostrophes.",
    status: "draft",
    score: 120,
    createdAt: "2024-04-12T00:00:00.000Z",
    tags: ["quotes"],
    authorId: "author-9",
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
  const runtimeWithMidLimits = buildDbxRuntime({ maxTokens: 9 });
  const runtimeWithHighLimits = buildDbxRuntime({ maxTokens: 20 });
  const postIds: string[] = [];

  for (const post of buildPosts()) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Post", post],
    });
    postIds.push(response.parsedBody as string);
  }

  for (const post of buildPosts()) {
    await runDbxRequest<string>(runtimeWithMidLimits, {
      method: "POST",
      path: "create",
      args: ["Post", post],
    });
  }

  for (const post of buildPosts()) {
    await runDbxRequest<string>(runtimeWithHighLimits, {
      method: "POST",
      path: "create",
      args: ["Post", post],
    });
  }

  const exactSentence = await runFullTextSearch(
    runtime,
    "exact",
    "quick brown fox jumps over",
  );
  const exactSentenceNineDefault = await runFullTextSearch(
    runtime,
    "exact",
    "quick brown fox jumps over 13 lazy dogs today",
  );
  const exactSentenceNineMid = await runFullTextSearch(
    runtimeWithMidLimits,
    "exact",
    "quick brown fox jumps over 13 lazy dogs today",
  );
  const exactSentenceNineHigh = await runFullTextSearch(
    runtimeWithHighLimits,
    "exact",
    "quick brown fox jumps over 13 lazy dogs today",
  );
  const exactLongDefault = await runFullTextSearch(
    runtime,
    "exact",
    "aurora borealis glows above arctic night sky with silent cold light over distant mountains under stars",
  );
  const exactLongMid = await runFullTextSearch(
    runtimeWithMidLimits,
    "exact",
    "aurora borealis glows above arctic night sky with silent cold light over distant mountains under stars",
  );
  const exactLongHigh = await runFullTextSearch(
    runtimeWithHighLimits,
    "exact",
    "aurora borealis glows above arctic night sky with silent cold light over distant mountains under stars",
  );
  const exactDiacritics = await runFullTextSearch(
    runtime,
    "exact",
    "naïve café résumé coöperate são paulo",
  );
  const exactStopwords = await runFullTextSearch(
    runtime,
    "exact",
    "the the the",
  );
  const exactQuotedPhrase = await runFullTextSearch(
    runtime,
    "exact",
    "quoted phrase",
  );
  const exactPunctuation = await runFullTextSearch(
    runtime,
    "exact",
    "edge case",
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
  const exactNumericShort = await runFullTextSearch(
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
  const lossyMixedCase = await runFullTextSearch(
    runtime,
    "lossy",
    "mixed case",
  );
  const lossyPunctuation = await runFullTextSearch(
    runtime,
    "lossy",
    "punctuation heavy",
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
  const lossyEmoji = await runFullTextSearch(runtime, "lossy", "rocket");
  const lossySmartApostrophes = await runFullTextSearch(
    runtime,
    "lossy",
    "smart apostrophes",
  );
  const lossyMixedPunctuation = await runFullTextSearch(
    runtime,
    "lossy",
    "o reilly",
  );

  return {
    createdPostIds: postIds,
    exactSentenceIds: exactSentence.ids,
    exactSentenceNineDefaultIds: exactSentenceNineDefault.ids,
    exactSentenceNineMidIds: exactSentenceNineMid.ids,
    exactSentenceNineHighIds: exactSentenceNineHigh.ids,
    exactLongDefaultIds: exactLongDefault.ids,
    exactLongMidIds: exactLongMid.ids,
    exactLongHighIds: exactLongHigh.ids,
    exactDiacriticsIds: exactDiacritics.ids,
    exactStopwordsIds: exactStopwords.ids,
    exactQuotedPhraseIds: exactQuotedPhrase.ids,
    exactPunctuationIds: exactPunctuation.ids,
    exactSeparatorsIds: exactSeparators.ids,
    exactHyphenatedIds: exactHyphenated.ids,
    exactNumericShortIds: exactNumericShort.ids,
    lossyMiddleTokenIds: lossyMiddleToken.ids,
    lossyDiacriticsIds: lossyDiacritics.ids,
    lossySeparatorsIds: lossySeparators.ids,
    lossyMixedCaseIds: lossyMixedCase.ids,
    lossyPunctuationIds: lossyPunctuation.ids,
    lossyAddressIds: lossyAddress.ids,
    lossyPrefixIds: lossyPrefix.ids,
    lossyShortTokenIds: lossyShortToken.ids,
    lossyEmojiIds: lossyEmoji.ids,
    lossySmartApostrophesIds: lossySmartApostrophes.ids,
    lossyMixedPunctuationIds: lossyMixedPunctuation.ids,
  };
};
