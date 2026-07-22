import {
  FullTextDdbBackend,
  RelationalDdbBackend,
  StructuredDdbBackend,
  createAwsSdkV3DynamoClient,
  createRelationEdgesDdbDependencies,
  type IndexTableConfig,
} from "@resistdesign/voltra/api";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";

/** One physical table configuration is shared by every logical index backend. */
export const createIndexingBackends = (
  ddbClient: DynamoDBClient,
  table: IndexTableConfig,
) => {
  const client = createAwsSdkV3DynamoClient(ddbClient);
  const structured = new StructuredDdbBackend({ client, table });

  return {
    fullText: new FullTextDdbBackend({ client, table }),
    structured,
    relationships: new RelationalDdbBackend(
      createRelationEdgesDdbDependencies({ client, table }),
    ),
  };
};
