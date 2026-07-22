import {
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  FullTextDdbBackend,
  RelationalDdbBackend,
  StructuredDdbBackend,
} from "../../src/api";
import {
  INDEXING_TABLE_ENV_VAR,
  readIndexingTableFromEnv,
} from "../common/IndexingTable";
import { ddbClient } from "./ddbClient";
import { collectRequiredEnvironmentVariables } from "../../src/common";

const ddbAdapter = createAwsSdkV3DynamoClient(ddbClient);

export const structuredStringTokenizer = {
  minNgramSize: 1,
  maxNgramSize: 3,
  maxIndexedStringLength: 128,
  maxTokensPerValue: 256,
} as const;

collectRequiredEnvironmentVariables([INDEXING_TABLE_ENV_VAR]);

const indexingTable = readIndexingTableFromEnv(process.env);

export const fullTextBackend = new FullTextDdbBackend({
  client: ddbAdapter,
  table: indexingTable,
});

const structuredBackend = new StructuredDdbBackend({
  client: ddbAdapter,
  table: indexingTable,
  tokenizer: structuredStringTokenizer,
});

export const structuredReader = structuredBackend.reader;
export const structuredWriter = structuredBackend.writer;

export const relationalBackend = new RelationalDdbBackend(
  createRelationEdgesDdbDependencies({
    client: ddbAdapter,
    table: indexingTable,
  }),
);
