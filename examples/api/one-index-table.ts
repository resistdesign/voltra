import {
  FullTextDdbBackend,
  RelationalDdbBackend,
  StructuredDdbBackend,
  IndexMutationCoordinator,
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  type IndexTableConfig,
} from "@resistdesign/voltra/api";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/**
 * One physical table configuration is shared by every logical index backend.
 *
 * For efficient Health/maintenance enumeration on DynamoDB, provision a
 * KEYS_ONLY GSI with `kind` as HASH and `pk` as RANGE, then pass its name
 * as `maintenanceIndexName`. Existing deployments may omit it and retain the
 * bounded scan fallback.
 */
export const createIndexingBackends = (
  ddbClient: DynamoDBClient,
  table: IndexTableConfig,
) => {
  const client = createAwsSdkV3DynamoClient(ddbClient);
  const mutationCoordinator = new IndexMutationCoordinator(client);
  const structured = new StructuredDdbBackend({
    client,
    table,
    mutationCoordinator,
  });

  return {
    fullText: new FullTextDdbBackend({
      client,
      table,
      mutationCoordinator,
    }),
    structured,
    relationships: new RelationalDdbBackend(
      createRelationEdgesDdbDependencies({
        client,
        table,
        mutationCoordinator,
      }),
    ),
    mutationCoordinator,
  };
};
