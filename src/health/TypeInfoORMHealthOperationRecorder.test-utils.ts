import { InMemoryDataItemDBDriver } from "../api/ORM/drivers";
import { DriverHealthStore } from "./DriverHealthStore";
import { TypeInfoORMHealthOperationRecorder } from "./TypeInfoORMHealthOperationRecorder";
import type { HealthRecord } from "./Types";

export const runHealthOperationRecorderScenario = async () => {
  let counter = 0;
  const store = new DriverHealthStore(
    new InMemoryDataItemDBDriver<HealthRecord, "id">({
      tableName: "Health",
      uniquelyIdentifyingFieldName: "id",
      generateUniqueIdentifier: () => `operation-${++counter}`,
    }),
    {
      now: () => 1000,
    },
  );
  const recorder = new TypeInfoORMHealthOperationRecorder({
    store,
    slowOperationMs: 100,
    recordRetentionMs: 5000,
    now: () => 1000,
  });

  await recorder.observe({
    operation: "read",
    typeName: "Book",
    startedAt: 10,
    durationMs: 20,
    success: true,
  });
  await recorder.observe({
    operation: "list",
    typeName: "Book",
    startedAt: 20,
    durationMs: 150,
    success: true,
    resultCount: 3,
  });
  await recorder.observe({
    operation: "update",
    typeName: "Book",
    startedAt: 30,
    durationMs: 5,
    success: false,
  });

  const page = await store.listRecords({ itemsPerPage: 10 });

  return page.records
    .map((record) => ({
      kind: record.kind,
      status: record.status,
      typeName: record.typeName,
      operation: record.operation,
      scope: record.scope,
      ...(record.count !== undefined ? { count: record.count } : {}),
      value: record.value,
      expiresAt: record.expiresAt,
      success: record.data?.success,
    }))
    .sort((left, right) =>
      String(left.scope) < String(right.scope)
        ? -1
        : String(left.scope) > String(right.scope)
          ? 1
          : 0,
    );
};
