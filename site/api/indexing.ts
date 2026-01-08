import {
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  FullTextDdbBackend,
  RelationalDdbBackend,
  StructuredDdbBackend,
} from "../../src/api/Indexing";
import {
  indexingTableEnvVars,
  readIndexingTablesFromEnv,
} from "../common/IndexingTableNames";
import { ddbClient } from "./ddbClient";
import { collectRequiredEnvironmentVariables } from "../../src/common/CommandLine/collectRequiredEnvironmentVariables";

const ddbAdapter = createAwsSdkV3DynamoClient(ddbClient);

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
});

export const structuredReader = structuredBackend.reader;
export const structuredWriter = structuredBackend.writer;

export const relationalBackend = new RelationalDdbBackend(
  createRelationEdgesDdbDependencies({
    client: ddbAdapter,
    tables: indexingTables.relations,
  }),
);
