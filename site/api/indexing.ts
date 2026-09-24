import {
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  createIndexBackend,
  FullTextDdbBackend,
  IndexMutationCoordinator,
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
export const indexMutationCoordinator = new IndexMutationCoordinator(
  ddbAdapter,
);

const textBackend = new FullTextDdbBackend({
  client: ddbAdapter,
  table: indexingTable,
  mutationCoordinator: indexMutationCoordinator,
});

const valueBackend = new StructuredDdbBackend({
  client: ddbAdapter,
  table: indexingTable,
  tokenizer: structuredStringTokenizer,
  mutationCoordinator: indexMutationCoordinator,
});

export const indexBackend = createIndexBackend({
  values: valueBackend.reader,
  valueWriter: valueBackend.writer,
  text: textBackend,
});
export const structuredOccupancyMaintenance = valueBackend.occupancyMaintenance;

export const relationalBackend = new RelationalDdbBackend(
  createRelationEdgesDdbDependencies({
    client: ddbAdapter,
    table: indexingTable,
    mutationCoordinator: indexMutationCoordinator,
  }),
);
