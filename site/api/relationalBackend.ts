import {
  RelationalDdbBackend,
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  type RelationsTableNames,
} from "../../src/api/Indexing";
import { ddbClient } from "./ddbClient";

const relationTables = {
  relationEdges: "RelationEdges",
} satisfies RelationsTableNames;

const ddbAdapter = createAwsSdkV3DynamoClient(ddbClient);

/**
 * DynamoDB-backed implementation of the relations backend used by the ORM layer.
 */
export const relationalBackend = new RelationalDdbBackend(
  createRelationEdgesDdbDependencies({
    client: ddbAdapter,
    tables: relationTables,
  }),
);
