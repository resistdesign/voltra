import {
  FullTextDdbBackend,
  RelationalDdbBackend,
  StructuredDdbBackend,
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
} from "../../src/api/Indexing";
import { readIndexingTablesFromEnv } from "../common/IndexingTableNames";
import { ddbClient } from "./ddbClient";

const ddbAdapter = createAwsSdkV3DynamoClient(ddbClient);
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
