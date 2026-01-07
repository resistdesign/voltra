import type { DynamoQueryClient } from "./ddb/Types";
import { FullTextDdbBackend } from "./fulltext/FullTextDdbBackend";
import { createRelationEdgesDdbDependencies } from "./rel/RelationalDdb";
import { StructuredDdbBackend } from "./structured/StructuredDdbBackend";

const stubClient: DynamoQueryClient = {
  batchWriteItem: async () => ({}),
  batchGetItem: async () => ({}),
  getItem: async () => ({}),
  query: async () => ({}),
};

/**
 * Validate that DDB backends fail fast when required table names are missing.
 */
export const runIndexingTablesValidationScenario = () => {
  let missingFullTextTableError: string | undefined;
  try {
    new FullTextDdbBackend({
      client: stubClient,
      tables: {
        lossyPostings: "",
        exactPostings: "ExactPostings",
        docMirror: "FullTextDocMirror",
        tokenStats: "FullTextTokenStats",
        docTokens: "DocTokens",
        docTokenPositions: "DocTokenPositions",
      },
    });
  } catch (error) {
    missingFullTextTableError = (error as Error).message ?? String(error);
  }

  let missingStructuredTableError: string | undefined;
  try {
    new StructuredDdbBackend({
      client: stubClient,
      tables: {
        termIndex: "StructuredTermIndex",
        rangeIndex: "",
        docFields: "StructuredDocFields",
      },
    });
  } catch (error) {
    missingStructuredTableError = (error as Error).message ?? String(error);
  }

  let missingRelationsTableError: string | undefined;
  try {
    createRelationEdgesDdbDependencies({
      client: stubClient,
      tables: { relationEdges: "" },
    });
  } catch (error) {
    missingRelationsTableError = (error as Error).message ?? String(error);
  }

  return {
    missingFullTextTableError,
    missingStructuredTableError,
    missingRelationsTableError,
  };
};
