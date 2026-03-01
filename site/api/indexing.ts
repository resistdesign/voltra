import {
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  FullTextDdbBackend,
  RelationalDdbBackend,
  StructuredDdbBackend,
} from "../../src/api";
import {
  indexingTableEnvVars,
  readIndexingTablesFromEnv,
} from "../common/IndexingTableNames";
import { ddbClient } from "./ddbClient";
import { collectRequiredEnvironmentVariables } from "../../src/common";

const ddbAdapter = createAwsSdkV3DynamoClient(ddbClient);

export const structuredStringTokenizer = {
  minNgramSize: 1,
  maxNgramSize: 3,
  maxIndexedStringLength: 128,
  maxTokensPerValue: 256,
} as const;

collectRequiredEnvironmentVariables([
  ...Object.values(indexingTableEnvVars.fullText),
  ...Object.values(indexingTableEnvVars.structured),
  ...Object.values(indexingTableEnvVars.relations),
]);

const indexingTables = readIndexingTablesFromEnv(process.env);

export const fullTextBackend = new FullTextDdbBackend({
  client: ddbAdapter,
  tables: indexingTables.fullText,
});

const structuredBackend = new StructuredDdbBackend({
  client: ddbAdapter,
  tables: indexingTables.structured,
  tokenizer: structuredStringTokenizer,
});

export const structuredReader = structuredBackend.reader;
export const structuredWriter = structuredBackend.writer;

export const relationalBackend = new RelationalDdbBackend(
  createRelationEdgesDdbDependencies({
    client: ddbAdapter,
    tables: indexingTables.relations,
  }),
);
