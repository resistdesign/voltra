import type {
  FullTextTableNames,
  RelationsTableNames,
  StructuredTableNames,
} from "../../src/api";

export type IndexingTableNames = {
  fullText: FullTextTableNames;
  structured: StructuredTableNames;
  relations: RelationsTableNames;
};

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

export const readIndexingTablesFromEnv = (
  env: NodeJS.ProcessEnv,
): IndexingTableNames => ({
  fullText: {
    lossyPostings: env[indexingTableEnvVars.fullText.lossyPostings] as string,
    exactPostings: env[indexingTableEnvVars.fullText.exactPostings] as string,
    docMirror: env[indexingTableEnvVars.fullText.docMirror] as string,
    tokenStats: env[indexingTableEnvVars.fullText.tokenStats] as string,
    docTokens: env[indexingTableEnvVars.fullText.docTokens] as string,
    docTokenPositions: env[
      indexingTableEnvVars.fullText.docTokenPositions
    ] as string,
  },
  structured: {
    termIndex: env[indexingTableEnvVars.structured.termIndex] as string,
    rangeIndex: env[indexingTableEnvVars.structured.rangeIndex] as string,
    docFields: env[indexingTableEnvVars.structured.docFields] as string,
  },
  relations: {
    relationEdges: env[indexingTableEnvVars.relations.relationEdges] as string,
  },
});
