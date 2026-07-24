import { InMemoryDynamoQueryClient } from "./InMemoryDynamoQueryClient.test-utils";
import { StructuredDdbBackend } from "../structured/StructuredDdbBackend";
import type { StructuredOccupancyFieldMap } from "../structured/StructuredOccupancy";

export const runInMemoryDynamoStaleVisibilityScenario = async () => {
  const client = new InMemoryDynamoQueryClient({
    eventuallyConsistentGetLag: 2,
  });
  const key = { pk: "doc", sk: "state" };
  await client.putItem({
    TableName: "Index",
    Item: { ...key, version: 1 },
  });
  const first = await client.getItem({ TableName: "Index", Key: key });
  const second = await client.getItem({ TableName: "Index", Key: key });
  const visible = await client.getItem({ TableName: "Index", Key: key });

  await client.putItem({
    TableName: "Index",
    Item: { ...key, version: 2 },
  });
  const staleAfterUpdate = await client.getItem({
    TableName: "Index",
    Key: key,
  });
  const strongAfterUpdate = await client.getItem({
    TableName: "Index",
    Key: key,
    ConsistentRead: true,
  });
  const stillStale = await client.getItem({ TableName: "Index", Key: key });
  const latest = await client.getItem({ TableName: "Index", Key: key });

  return {
    createReads: [
      first.Item?.version ?? null,
      second.Item?.version ?? null,
      visible.Item?.version ?? null,
    ],
    updateReads: [
      staleAfterUpdate.Item?.version ?? null,
      strongAfterUpdate.Item?.version ?? null,
      stillStale.Item?.version ?? null,
      latest.Item?.version ?? null,
    ],
    staleGetCount: client.staleGetCount,
    consistentGetCount: client.consistentGetCount,
  };
};

export const runStructuredDynamoAdverseReadScenario = async () => {
  const client = new InMemoryDynamoQueryClient({
    eventuallyConsistentGetLag: 20,
    reverseReadPropertyOrder: true,
  });
  const table = { tableName: "Index" };
  const backend = new StructuredDdbBackend({ client, table });
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    name: { type: "string" },
  };

  await backend.writer.write(
    "doc",
    { age: 23, name: "Amy" },
    { occupancyFields },
  );
  await backend.writer.write(
    "doc",
    { name: "Zoe", age: 24 },
    { occupancyFields: { name: { type: "string" }, age: { type: "number" } } },
  );

  const records = client.snapshot(table.tableName);
  const state = records.find(
    (item) => item.kind === "sd" && item.docId === "doc",
  );
  return {
    version: state?.version,
    fields: state?.fields,
    staleGetCount: client.staleGetCount,
    consistentReadsUsed: client.consistentGetCount > 0,
    rangeRows: records.filter((item) => item.kind === "sr").length,
    occupancyRows: records.filter((item) => item.kind === "so").length,
  };
};

export const runStructuredDynamoSequentialSeedScaleScenario = async () => {
  const client = new InMemoryDynamoQueryClient({
    eventuallyConsistentGetLag: 20,
  });
  const table = { tableName: "Index" };
  const backend = new StructuredDdbBackend({ client, table });
  const occupancyFields: StructuredOccupancyFieldMap = {
    age: { type: "number" },
    score: { type: "number" },
  };
  const count = 403;

  for (let index = 0; index < count; index += 1) {
    await backend.writer.write(
      `seed-${index}`,
      { age: index, score: count - index },
      { occupancyFields },
    );
  }

  const records = client.snapshot(table.tableName);
  return {
    documents: records.filter((item) => item.kind === "sd").length,
    equalityTerms: records.filter(
      (item) => item.kind === "st" && item.mode === "eq",
    ).length,
    rangeRows: records.filter((item) => item.kind === "sr").length,
    occupancyRows: records.filter((item) => item.kind === "so").length,
    staleGetCount: client.staleGetCount,
    consistentReadsUsed: client.consistentGetCount > 0,
  };
};
