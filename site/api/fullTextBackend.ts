import {
  FullTextDdbBackend,
  createAwsSdkV3DynamoClient,
  type FullTextTableNames,
} from "../../src/api/Indexing";
import { ddbClient } from "./ddbClient";

/**
 * Builds a {@link FullTextDdbBackend} wired to the shared DynamoDB client with the
 * necessary AWS SDK conversions.
 */
export const createFullTextBackend = () =>
  new FullTextDdbBackend({
    tables: {
      lossyPostings: "LossyPostings",
      exactPostings: "ExactPostings",
      docMirror: "FullTextDocMirror",
      tokenStats: "FullTextTokenStats",
      docTokens: "DocTokens",
      docTokenPositions: "DocTokenPositions",
    } satisfies FullTextTableNames,
    client: createAwsSdkV3DynamoClient(ddbClient),
  });

/**
 * Shared singleton instance of the full-text backend used by the API route map.
 */
export const fullTextBackend = createFullTextBackend();
