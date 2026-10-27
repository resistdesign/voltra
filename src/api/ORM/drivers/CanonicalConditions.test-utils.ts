import assert from "node:assert/strict";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  TypeInfoORMService,
  getDriverMethodWithModifiedError,
} from "../TypeInfoORMService";
import { DynamoDBDataItemDBDriver } from "./DynamoDBDataItemDBDriver";
import { InMemoryFileItemDBDriver } from "./InMemoryFileItemDBDriver";
import { S3FileItemDBDriver } from "./S3FileItemDBDriver";
import {
  TypeInfoORMServiceError,
  TypeInfoORMUpdateOperators,
} from "../../../common/TypeInfoORM";

export const runCanonicalConditionCommands = async () => {
  const driver = new DynamoDBDataItemDBDriver<Record<string, any>, "id">({
    tableName: "Records",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => "pair",
  });
  const commands: any[] = [];
  let failure: Error | undefined;
  // Intercept send: this tests command construction/translation, not AWS concurrency.
  (driver as any).dynamoDBClient.send = async (command: any) => {
    commands.push(command.input);
    if (failure) throw failure;
    return { Attributes: { id: { S: "pair" } }, Item: { id: { S: "pair" } } };
  };
  await driver.createItem({ name: "first" }, { ifAbsent: true });
  await driver.updateItem(
    "pair",
    { guard0: 2, name: "next" },
    {
      preconditions: { expected: { guard0: 7, "state.with.dot": "pending" } },
      fieldOperators: { guard0: TypeInfoORMUpdateOperators.NUMBER.INCREMENT },
    },
  );
  await driver.readItem("pair", ["id"], { consistency: "strong" });
  await driver.createItem({ name: "default" });
  await driver.updateItem("pair", { name: "default" });
  await driver.readItem("pair", ["id"]);
  const [create, update, strong, defaultCreate, defaultUpdate, defaultRead] =
    commands;
  assert.equal(defaultRead.ConsistentRead, undefined);
  assert.deepEqual(
    strong.ProjectionExpression,
    defaultRead.ProjectionExpression,
  );
  assert.deepEqual(
    strong.ExpressionAttributeNames,
    defaultRead.ExpressionAttributeNames,
  );
  assert.equal(create.ConditionExpression, "attribute_not_exists(#createKey)");
  assert.equal(create.ExpressionAttributeNames["#createKey"], "id");
  assert.deepEqual(unmarshall(create.Item), { id: "pair", name: "first" });
  const names = update.ExpressionAttributeNames;
  const values = unmarshall(update.ExpressionAttributeValues);
  const existence = update.ConditionExpression.match(
    /attribute_exists\((#[^)]+)\)/,
  );
  assert.equal(names[existence[1]], "id");
  const equalities = [
    ...update.ConditionExpression.matchAll(/(#[\w]+) = (:[\w]+)/g),
  ];
  assert.deepEqual(
    equalities.map((match) => [names[match[1]], values[match[2]]]),
    [
      ["guard0", 7],
      ["state.with.dot", "pending"],
    ],
  );
  assert.match(update.UpdateExpression, /ADD #guard0 :guard0/);
  assert.equal(values[":guard0"], 2);
  assert.equal(names["#guard0"], "guard0");
  assert.equal(strong.ConsistentRead, true);
  assert.equal(defaultCreate.ConditionExpression, undefined);
  assert.equal(defaultUpdate.ConditionExpression, undefined);
  await driver.updateItem(
    "pair",
    { count: 2 },
    {
      preconditions: { expected: { count: 7 } },
      fieldOperators: { count: TypeInfoORMUpdateOperators.NUMBER.DECREMENT },
    },
  );
  const decrement = commands.at(-1);
  const decrementValues = unmarshall(decrement.ExpressionAttributeValues);
  assert.equal(decrementValues[":count_decrement"], -2);
  const usedValues = new Set(
    `${decrement.UpdateExpression} ${decrement.ConditionExpression}`.match(
      /:[\w]+/g,
    ),
  );
  assert.deepEqual(new Set(Object.keys(decrementValues)), usedValues);
  failure = Object.assign(new Error("lost"), {
    name: "ConditionalCheckFailedException",
    $metadata: { requestId: "guarded-put", httpStatusCode: 400 },
  });
  const wrappedCreate = getDriverMethodWithModifiedError(
    { typeName: "Record" },
    driver,
    "createItem",
  );
  await assert.rejects(
    () => wrappedCreate({ name: "loser" }, { ifAbsent: true }),
    (error: any) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, "Error");
      assert.ok(error.stack?.includes("CONDITIONAL_WRITE_CONFLICT"));
      assert.equal(error.cause, failure);
      assert.equal((error.cause as any).$metadata.requestId, "guarded-put");
      assert.equal((error as any).typeName, "Record");
      return true;
    },
  );
  const conflict = async (call: () => Promise<unknown>) => {
    try {
      await call();
      return "NO_ERROR";
    } catch (error: any) {
      return error.message;
    }
  };
  const createConflict = await conflict(() =>
    driver.createItem({ name: "loser" }, { ifAbsent: true }),
  );
  const updateConflict = await conflict(() =>
    driver.updateItem(
      "pair",
      { name: "loser" },
      { preconditions: { exists: true } },
    ),
  );
  failure = new Error("NETWORK_UNAVAILABLE");
  const infrastructure = await conflict(() =>
    driver.createItem({ name: "retry" }, { ifAbsent: true }),
  );
  assert.equal(
    createConflict,
    TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT,
  );
  return {
    commandGuardsVerified: true,
    createConflict,
    updateConflict,
    infrastructure,
  };
};

export const runFileRequirements = async () => {
  const settings = {
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id" as const,
    dbSpecificConfig: { bucketName: "test", s3Config: {} },
  };
  const drivers = [
    new InMemoryFileItemDBDriver(settings),
    new S3FileItemDBDriver(settings),
  ];
  const errors: string[] = [];
  for (const driver of drivers) {
    if (driver instanceof InMemoryFileItemDBDriver) {
      const id = await driver.createItem({ name: "current", sizeInBytes: 7 });
      await driver.updateItem(id, { sizeInBytes: 9 });
      assert.deepEqual(
        await driver.readItem(id, ["sizeInBytes"], { consistency: "strong" }),
        { sizeInBytes: 9 },
      );
    } else {
      let heads = 0;
      (driver as any).s3.send = async (command: any) => {
        assert.equal(command.constructor.name, "HeadObjectCommand");
        heads++;
        return { ContentLength: 9, ContentType: "text/plain" };
      };
      const item = await driver.readItem("current", ["sizeInBytes"], {
        consistency: "strong",
      });
      assert.equal(item.sizeInBytes, 9);
      assert.equal(heads, 1);
    }
    // Direct driver callers must also receive a refusal rather than an ignored guard.
    await assert.rejects(
      () => driver.createItem({ name: "test" }, { ifAbsent: true }),
      { message: TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY },
    );
    await assert.rejects(
      () =>
        driver.updateItem(
          "one",
          { name: "test" },
          { preconditions: { exists: true } },
        ),
      { message: TypeInfoORMServiceError.UNSUPPORTED_CAPABILITY },
    );
    const field = {
      type: "string" as const,
      optional: false,
      readonly: false,
      array: false,
    };
    const orm = new TypeInfoORMService({
      useDAC: false,
      typeInfoMap: {
        File: { primaryField: "id", fields: { id: field, name: field } },
      },
      getDriver: () => driver,
      getRelationshipDriver: () => {
        throw new Error("unused");
      },
    });
    for (const call of [
      () => orm.create("File", { name: "test" }, { ifAbsent: true }),
      () =>
        orm.update(
          "File",
          { id: "one", name: "test" },
          { preconditions: { exists: true } },
        ),
    ]) {
      try {
        await call();
        errors.push("NO_ERROR");
      } catch (error: any) {
        errors.push(error.message);
      }
    }
  }
  return { errors };
};

/** Missing exclusion is refused at each driver boundary before I/O or index work. */
export const runCoordinationRefusal = async () => {
  const { StructuredInMemoryBackend } =
    await import("./InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend");
  const { createIndexBackend, qualifyIndexField } =
    await import("../../Indexing");
  const { getTypeInfoORMIndexingConfigFromTypeInfoMap } =
    await import("../getTypeInfoORMIndexingConfigFromTypeInfoMap");
  const settings = {
    tableName: "Records",
    uniquelyIdentifyingFieldName: "id" as const,
    dbSpecificConfig: { bucketName: "unused", s3Config: {} },
  };
  const drivers = [
    new DynamoDBDataItemDBDriver(settings),
    new S3FileItemDBDriver(settings),
  ];
  for (const driver of drivers) {
    const noIO = async () => {
      throw new Error("UNEXPECTED_IO");
    };
    if (driver instanceof DynamoDBDataItemDBDriver)
      (driver as any).dynamoDBClient.send = noIO;
    if (driver instanceof S3FileItemDBDriver) (driver as any).s3.send = noIO;
    let callbacks = 0;
    const coordination = {
      inspect: async () => {
        callbacks++;
      },
      changed: async () => {
        callbacks++;
      },
    };
    for (const call of [
      () => driver.createItem({ name: "loser" }, { coordination }),
      () => driver.updateItem("one", { name: "loser" }, { coordination }),
      () => driver.deleteItem("one", { coordination }),
      () => driver.readItem("one", undefined, { coordination }),
    ])
      await assert.rejects(call, { message: "UNSUPPORTED_CAPABILITY" });
    const field = {
      type: "string" as const,
      optional: false,
      readonly: false,
      array: false,
    };
    const typeInfoMap = {
      Record: {
        primaryField: "id",
        fields: {
          id: field,
          name: { ...field, tags: { indexed: { exact: true } } },
        },
      },
    };
    const values = new StructuredInMemoryBackend();
    const indexField = qualifyIndexField("Record", "name");
    await values.write("one", { [indexField]: "preserved" });
    const orm = new TypeInfoORMService({
      useDAC: false,
      typeInfoMap,
      getDriver: () => driver,
      getRelationshipDriver: () => {
        throw new Error("unused");
      },
      indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
        backend: createIndexBackend({ values, valueWriter: values }),
      }),
    });
    for (const call of [
      () => orm.create("Record", { name: "loser" }),
      () => orm.update("Record", { id: "one", name: "loser" }),
      () => orm.delete("Record", "one"),
      () => orm.reindexStoredItem("Record", "one"),
    ])
      await assert.rejects(call, { message: "UNSUPPORTED_CAPABILITY" });
    const cleanup = await orm.cleanupOrphanedIndexState("Record", "one", {
      structuredVersion: 1,
    });
    assert.equal(cleanup.status, "maintenanceUnsupported");
    assert.equal(cleanup.cleanupAttempted, false);
    assert.equal(callbacks, 0);
    assert.deepEqual(
      (await values.terms.query(indexField, "eq", "preserved")).candidateIds,
      ["one"],
    );
    assert.deepEqual(
      (await values.terms.query(indexField, "eq", "loser")).candidateIds,
      [],
    );
  }
  return { verified: true };
};

/** In-memory files retain the generic indexing semantics, including metadata overwrites. */
export const runFileCoordinatedIndexes = async () => {
  const { StructuredInMemoryBackend } =
    await import("./InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend");
  const { createIndexBackend, qualifyIndexField } =
    await import("../../Indexing");
  const { getTypeInfoORMIndexingConfigFromTypeInfoMap } =
    await import("../getTypeInfoORMIndexingConfigFromTypeInfoMap");
  const field = {
    type: "string" as const,
    optional: false,
    readonly: false,
    array: false,
  };
  const typeInfoMap = {
    File: {
      primaryField: "id",
      fields: {
        id: field,
        name: field,
        mimeType: { ...field, tags: { indexed: { exact: true } } },
      },
    },
  };
  const driver = new InMemoryFileItemDBDriver({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
  });
  const values = new StructuredInMemoryBackend();
  const orm = new TypeInfoORMService({
    useDAC: false,
    typeInfoMap,
    getDriver: () => driver,
    getRelationshipDriver: () => {
      throw new Error("unused");
    },
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({ values, valueWriter: values }),
    }),
  });
  const ids = async (mime: string) =>
    (
      await values.terms.query(
        qualifyIndexField("File", "mimeType"),
        "eq",
        mime,
      )
    ).candidateIds;
  await orm.create("File", { name: "file", mimeType: "old" });
  await orm.create("File", { name: "file", mimeType: "overwritten" });
  assert.deepEqual(await ids("old"), []);
  await orm.update("File", { id: "file", mimeType: "current" });
  assert.deepEqual(await ids("overwritten"), []);
  assert.deepEqual(await ids("current"), ["file"]);
  await orm.update("File", { id: "file", name: "renamed" });
  assert.deepEqual(await ids("current"), ["renamed"]);
  await orm.create("File", { name: "occupied", mimeType: "preserved" });
  await assert.rejects(
    () => orm.update("File", { id: "renamed", name: "occupied" }),
    { message: "CONDITIONAL_WRITE_CONFLICT" },
  );
  await assert.rejects(
    () => orm.create("File", { name: "file", mimeType: "loser" }),
    { message: "UNSUPPORTED_CAPABILITY" },
  );
  assert.equal((await driver.readItem("renamed")).mimeType, "current");
  assert.equal((await driver.readItem("occupied")).mimeType, "preserved");
  assert.deepEqual(await ids("current"), ["renamed"]);
  assert.deepEqual(await ids("preserved"), ["occupied"]);
  assert.deepEqual(await ids("loser"), []);
  const read = driver.readItem;
  driver.readItem = (id, selected, options) => {
    if (!options?.coordination) throw new Error("ORDINARY_READ_FORBIDDEN");
    return read(id, selected, options);
  };
  await orm.reindexStoredItem("File", "file");
  (orm as any).cleanupRelationships = async () => undefined;
  await orm.delete("File", "file");
  assert.deepEqual(await ids("current"), []);
  await assert.rejects(() => read("file"), { message: "ITEM_NOT_FOUND" });
  return { verified: true };
};
