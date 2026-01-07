export type AttributeMap = Record<string, unknown>;

/**
 * Input payload for DynamoDB batch write operations.
 */
export type BatchWriteItemInput = {
  /**
   * DynamoDB batch write request items by table name.
   */
  RequestItems: Record<string, WriteRequest[]>;
};

/**
 * Output payload from DynamoDB batch write operations.
 */
export type BatchWriteItemOutput = {
  /**
   * Unprocessed write requests to retry.
   */
  UnprocessedItems?: Record<string, WriteRequest[]>;
};

/**
 * DynamoDB batch get keys and projection configuration.
 */
export type KeysAndAttributes = {
  /**
   * Keys to read in a batch get request.
   */
  Keys: AttributeMap[];
  /**
   * Optional projection expression to limit returned attributes.
   */
  ProjectionExpression?: string;
};

/**
 * Input payload for DynamoDB batch get operations.
 */
export type BatchGetItemInput = {
  /**
   * DynamoDB batch get request items by table name.
   */
  RequestItems: Record<string, KeysAndAttributes>;
};

/**
 * Output payload from DynamoDB batch get operations.
 */
export type BatchGetItemOutput = {
  /**
   * Response items keyed by table name.
   */
  Responses?: Record<string, AttributeMap[]>;
  /**
   * Unprocessed keys to retry.
   */
  UnprocessedKeys?: Record<string, KeysAndAttributes>;
};

/**
 * Input payload for DynamoDB get item operations.
 */
export type GetItemInput = {
  /**
   * DynamoDB table name.
   */
  TableName: string;
  /**
   * Key attributes for the item.
   */
  Key: AttributeMap;
};

/**
 * Output payload from DynamoDB get item operations.
 */
export type GetItemOutput = {
  /**
   * Returned item attributes.
   */
  Item?: AttributeMap;
};

/**
 * DynamoDB batch write request entry.
 */
export type WriteRequest = {
  /**
   * Put request for an item.
   */
  PutRequest?: { Item: AttributeMap };
  /**
   * Delete request for an item.
   */
  DeleteRequest?: { Key: AttributeMap };
};

/**
 * DynamoDB client interface for batch writes/reads and get operations.
 */
export type DynamoBatchWriter = {
  /**
   * Execute a DynamoDB batch write operation.
   * @param input Batch write input payload.
   * @returns Batch write output payload.
   */
  batchWriteItem(input: BatchWriteItemInput): Promise<BatchWriteItemOutput>;
  /**
   * Execute a DynamoDB batch get operation.
   * @param input Batch get input payload.
   * @returns Batch get output payload.
   */
  batchGetItem(input: BatchGetItemInput): Promise<BatchGetItemOutput>;
  /**
   * Execute a DynamoDB get item operation.
   * @param input Get item input payload.
   * @returns Get item output payload.
   */
  getItem(input: GetItemInput): Promise<GetItemOutput>;
};

/**
 * Input payload for DynamoDB query operations.
 */
export type QueryInput = {
  /**
   * DynamoDB table name.
   */
  TableName: string;
  /**
   * Key condition expression for the query.
   */
  KeyConditionExpression: string;
  /**
   * Expression attribute name mappings.
   */
  ExpressionAttributeNames?: Record<string, string>;
  /**
   * Expression attribute values for the query.
   */
  ExpressionAttributeValues: AttributeMap;
  /**
   * Exclusive start key for pagination.
   */
  ExclusiveStartKey?: AttributeMap;
  /**
   * Maximum number of items to return.
   */
  Limit?: number;
};

/**
 * Output payload from DynamoDB query operations.
 */
export type QueryOutput = {
  /**
   * Items returned by the query.
   */
  Items?: AttributeMap[];
  /**
   * Last evaluated key for pagination.
   */
  LastEvaluatedKey?: AttributeMap;
};

/**
 * DynamoDB client interface with query support.
 */
export type DynamoQueryClient = DynamoBatchWriter & {
  /**
   * Execute a DynamoDB query operation.
   * @param input Query input payload.
   * @returns Query output payload.
   */
  query(input: QueryInput): Promise<QueryOutput>;
};
