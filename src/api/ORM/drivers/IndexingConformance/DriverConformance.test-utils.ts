import {
  indexDocument,
  replaceFullTextDocument,
  searchExact,
  searchLossy,
} from "../../../Indexing/API";
import { qualifyIndexField } from "../../../Indexing/fieldQualification";
import { searchStructured } from "../../../Indexing/structured/SearchStructured";
import type { StructuredOccupancyFieldMap } from "../../../Indexing/structured/StructuredOccupancy";
import type { TextIndexBackend, TextIndexMaintenance } from "../../../Indexing/Types";
import type { RelationalBackend } from "../../../Indexing/rel/Types";
import { FullTextMemoryBackend } from "../InMemoryDataItemDBDriver/Indexing/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend";
import { RelationalInMemoryBackend } from "../InMemoryDataItemDBDriver/Indexing/RelationalInMemoryBackend";
import { FullTextDdbBackend } from "../DynamoDBDataItemDBDriver/Indexing/FullTextDdbBackend";
import { StructuredDdbBackend } from "../DynamoDBDataItemDBDriver/Indexing/StructuredDdbBackend";
import {
  RelationalDdbBackend,
  createRelationEdgesDdbDependencies,
} from "../DynamoDBDataItemDBDriver/Indexing/RelationalDdb";
import { InMemoryDynamoQueryClient } from "../DynamoDBDataItemDBDriver/Indexing/InMemoryDynamoQueryClient.test-utils";
import { FullTextS3Backend } from "../S3FileItemDBDriver/Indexing/FullTextS3Backend";
import { StructuredS3Backend } from "../S3FileItemDBDriver/Indexing/StructuredS3Backend";
import { RelationalS3Backend } from "../S3FileItemDBDriver/Indexing/RelationalS3Backend";
import { InMemoryS3IndexObjectStore } from "../S3FileItemDBDriver/Indexing/S3IndexObjectStore.test-utils";

const textField = qualifyIndexField("Record", "title");

const exerciseFullText = async (
  backend: TextIndexBackend & TextIndexMaintenance,
) => {
  const first = { id: "1", title: "hello world" };
  const second = { id: "2", title: "hello there" };
  await indexDocument({
    backend,
    document: first,
    primaryField: "id",
    indexField: "title",
    indexFieldQualified: textField,
  });
  await indexDocument({
    backend,
    document: second,
    primaryField: "id",
    indexField: "title",
    indexFieldQualified: textField,
  });
  const replacement = { id: "1", title: "hello brave world" };
  await replaceFullTextDocument({
    backend,
    previousDocument: first,
    nextDocument: replacement,
    primaryField: "id",
    indexField: "title",
    indexFieldQualified: textField,
  });

  const lossy = await searchLossy({
    backend,
    query: "hello",
    indexField: textField,
  });
  const exact = await searchExact({
    backend,
    query: '"hello brave world"',
    indexField: textField,
  });
  const mirror = await backend.readDocumentIndex("1", textField);
  const listed = await backend.listDocuments({ limit: 10 });

  return {
    lossy: lossy.docIds,
    exact: exact.docIds,
    mirror,
    listed: listed.documents
      .map(({ docId, indexField }) => `${String(docId)}:${indexField}`)
      .sort(),
  };
};

const occupancyFields: StructuredOccupancyFieldMap = {
  state: { type: "string" },
  score: { type: "number" },
};

const exerciseStructured = async (
  reader: Parameters<typeof searchStructured>[0],
  write: (
    docId: string,
    fields: Record<string, string | number>,
  ) => Promise<void>,
) => {
  await write("1", { state: "published", score: 20 });
  await write("2", { state: "draft", score: 10 });
  await write("3", { state: "published", score: 30 });

  const term = await searchStructured(
    reader,
    { type: "term", field: "state", mode: "eq", value: "published" },
    { limit: 10, occupancyFields },
  );
  const range = await searchStructured(
    reader,
    { type: "between", field: "score", lower: 15, upper: 30 },
    { limit: 10, orderBy: { field: "score" }, occupancyFields },
  );

  return {
    term: term.candidateIds,
    range: range.candidateIds,
  };
};

const exerciseRelations = async (
  backend: RelationalBackend<{ weight: number }>,
) => {
  await backend.putEdge({
    key: { from: "a", to: "b", relation: "owns" },
    metadata: { weight: 1 },
  });
  await backend.putEdge({
    key: { from: "a", to: "c", relation: "owns" },
    metadata: { weight: 2 },
  });
  const first = await backend.getOutgoing("a", "owns", { limit: 1 });
  const second = await backend.getOutgoing("a", "owns", {
    limit: 1,
    cursor: first.nextCursor,
  });
  await backend.removeEdge({ from: "a", to: "b", relation: "owns" });
  const afterRemove = await backend.getOutgoing("a", "owns", { limit: 10 });

  return {
    first: first.edges.map((edge) => edge.key.to),
    second: second.edges.map((edge) => edge.key.to),
    afterRemove: afterRemove.edges.map((edge) => edge.key.to),
  };
};

export const runIndexDriverConformanceScenario = async () => {
  const memoryText = new FullTextMemoryBackend();
  const dynamoTextClient = new InMemoryDynamoQueryClient();
  const dynamoText = new FullTextDdbBackend({
    client: dynamoTextClient,
    table: { tableName: "ConformanceText" },
  });

  const memoryStructured = new StructuredInMemoryBackend();
  const dynamoStructuredClient = new InMemoryDynamoQueryClient();
  const dynamoStructured = new StructuredDdbBackend({
    client: dynamoStructuredClient,
    table: { tableName: "ConformanceStructured" },
  });

  const s3Text = new FullTextS3Backend({
    store: new InMemoryS3IndexObjectStore(),
  });

  const s3Structured = new StructuredS3Backend({
    store: new InMemoryS3IndexObjectStore(),
  });

  const memoryRelations = new RelationalInMemoryBackend<{ weight: number }>();
  const dynamoRelationsClient = new InMemoryDynamoQueryClient();
  const dynamoRelations = new RelationalDdbBackend<{ weight: number }>(
    createRelationEdgesDdbDependencies({
      client: dynamoRelationsClient,
      table: { tableName: "ConformanceRelations" },
    }),
  );
  const s3Relations = new RelationalS3Backend<{ weight: number }>({
    store: new InMemoryS3IndexObjectStore(),
  });

  const [
    memoryTextResult,
    dynamoTextResult,
    s3TextResult,
    memoryStructuredResult,
    dynamoStructuredResult,
    s3StructuredResult,
    memoryRelationResult,
    dynamoRelationResult,
    s3RelationResult,
  ] = await Promise.all([
    exerciseFullText(memoryText),
    exerciseFullText(dynamoText),
    exerciseFullText(s3Text),
    exerciseStructured(
      memoryStructured,
      (docId, fields) =>
        memoryStructured.write(docId, fields, { occupancyFields }),
    ),
    exerciseStructured(
      dynamoStructured.reader,
      (docId, fields) =>
        dynamoStructured.writer.write(docId, fields, { occupancyFields }),
    ),
    exerciseStructured(
      s3Structured.reader,
      (docId, fields) =>
        s3Structured.writer.write(docId, fields, { occupancyFields }),
    ),
    exerciseRelations(memoryRelations),
    exerciseRelations(dynamoRelations),
    exerciseRelations(s3Relations),
  ]);

  return {
    fullTextEqual:
      JSON.stringify(memoryTextResult) === JSON.stringify(dynamoTextResult) &&
      JSON.stringify(memoryTextResult) === JSON.stringify(s3TextResult),
    structuredEqual:
      JSON.stringify(memoryStructuredResult) ===
        JSON.stringify(dynamoStructuredResult) &&
      JSON.stringify(memoryStructuredResult) ===
        JSON.stringify(s3StructuredResult),
    relationalEqual:
      JSON.stringify(memoryRelationResult) ===
        JSON.stringify(dynamoRelationResult) &&
      JSON.stringify(memoryRelationResult) ===
        JSON.stringify(s3RelationResult),
    memoryTextResult,
    dynamoTextResult,
    s3TextResult,
    memoryStructuredResult,
    dynamoStructuredResult,
    s3StructuredResult,
    memoryRelationResult,
    dynamoRelationResult,
    s3RelationResult,
  };
};

export const runIndexDriverConformanceEqualScenario = async () => {
  const result = await runIndexDriverConformanceScenario();

  return {
    fullText: {
      memoryDynamo: {
        lossy:
          JSON.stringify(result.memoryTextResult.lossy) ===
          JSON.stringify(result.dynamoTextResult.lossy),
        exact: {
          equal:
            JSON.stringify(result.memoryTextResult.exact) ===
            JSON.stringify(result.dynamoTextResult.exact),
          memory: result.memoryTextResult.exact,
          dynamo: result.dynamoTextResult.exact,
        },
        mirror: result.memoryTextResult.mirror === result.dynamoTextResult.mirror,
        listed:
          JSON.stringify(result.memoryTextResult.listed) ===
          JSON.stringify(result.dynamoTextResult.listed),
      },
      memoryS3: {
        lossy:
          JSON.stringify(result.memoryTextResult.lossy) ===
          JSON.stringify(result.s3TextResult.lossy),
        exact: {
          equal:
            JSON.stringify(result.memoryTextResult.exact) ===
            JSON.stringify(result.s3TextResult.exact),
          memory: result.memoryTextResult.exact,
          s3: result.s3TextResult.exact,
        },
        mirror: result.memoryTextResult.mirror === result.s3TextResult.mirror,
        listed:
          JSON.stringify(result.memoryTextResult.listed) ===
          JSON.stringify(result.s3TextResult.listed),
      },
    },
    structured: result.structuredEqual,
    relational: result.relationalEqual,
  };
};
