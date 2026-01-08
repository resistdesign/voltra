import type {
  FullTextTableNames,
  RelationsTableNames,
  StructuredTableNames,
} from "../../src/api/Indexing";

export type IndexingTableNames = {
  fullText: FullTextTableNames;
  structured: StructuredTableNames;
  relations: RelationsTableNames;
};

export const indexingTableNames = {
  fullText: {
    lossyPostings: "LossyPostings",
    exactPostings: "ExactPostings",
    docMirror: "FullTextDocMirror",
    tokenStats: "FullTextTokenStats",
    docTokens: "DocTokens",
    docTokenPositions: "DocTokenPositions",
  },
  structured: {
    termIndex: "StructuredTermIndex",
    rangeIndex: "StructuredRangeIndex",
    docFields: "StructuredDocFields",
  },
  relations: {
    relationEdges: "RelationEdges",
  },
} as const satisfies IndexingTableNames;

export const indexingTableEnvVars = {
  fullText: {
    lossyPostings: "INDEXING_FULLTEXT_LOSSY_POSTINGS_TABLE",
    exactPostings: "INDEXING_FULLTEXT_EXACT_POSTINGS_TABLE",
    docMirror: "INDEXING_FULLTEXT_DOC_MIRROR_TABLE",
    tokenStats: "INDEXING_FULLTEXT_TOKEN_STATS_TABLE",
    docTokens: "INDEXING_FULLTEXT_DOC_TOKENS_TABLE",
    docTokenPositions: "INDEXING_FULLTEXT_DOC_TOKEN_POSITIONS_TABLE",
  },
  structured: {
    termIndex: "INDEXING_STRUCTURED_TERM_INDEX_TABLE",
    rangeIndex: "INDEXING_STRUCTURED_RANGE_INDEX_TABLE",
    docFields: "INDEXING_STRUCTURED_DOC_FIELDS_TABLE",
  },
  relations: {
    relationEdges: "INDEXING_RELATION_EDGES_TABLE",
  },
} as const;

const readRequiredEnv = (
  env: NodeJS.ProcessEnv,
  key: string,
): string => {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const readIndexingTablesFromEnv = (
  env: NodeJS.ProcessEnv,
): IndexingTableNames => ({
  fullText: {
    lossyPostings: readRequiredEnv(
      env,
      indexingTableEnvVars.fullText.lossyPostings,
    ),
    exactPostings: readRequiredEnv(
      env,
      indexingTableEnvVars.fullText.exactPostings,
    ),
    docMirror: readRequiredEnv(
      env,
      indexingTableEnvVars.fullText.docMirror,
    ),
    tokenStats: readRequiredEnv(
      env,
      indexingTableEnvVars.fullText.tokenStats,
    ),
    docTokens: readRequiredEnv(
      env,
      indexingTableEnvVars.fullText.docTokens,
    ),
    docTokenPositions: readRequiredEnv(
      env,
      indexingTableEnvVars.fullText.docTokenPositions,
    ),
  },
  structured: {
    termIndex: readRequiredEnv(env, indexingTableEnvVars.structured.termIndex),
    rangeIndex: readRequiredEnv(env, indexingTableEnvVars.structured.rangeIndex),
    docFields: readRequiredEnv(env, indexingTableEnvVars.structured.docFields),
  },
  relations: {
    relationEdges: readRequiredEnv(env, indexingTableEnvVars.relations.relationEdges),
  },
});
