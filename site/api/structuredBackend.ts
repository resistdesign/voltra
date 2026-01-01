import { StructuredDdbBackend } from "../../src/api/Indexing";

import { ddbClient } from "./ddbClient";

/**
 * Shared DynamoDB-backed structured indexing backend used by the route map.
 */
const structuredBackend = new StructuredDdbBackend({ client: ddbClient });

/**
 * Reader API for structured queries against the shared backend instance.
 */
export const structuredReader = structuredBackend.reader;
/**
 * Writer API for structured mutations against the shared backend instance.
 */
export const structuredWriter = structuredBackend.writer;
