import assert from "node:assert/strict";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { TypeInfoORMService, getDriverMethodWithModifiedError } from "../TypeInfoORMService";
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
  await driver.readItemStronglyConsistent("pair", ["id"]);
  await driver.createItem({ name: "default" });
  await driver.updateItem("pair", { name: "default" });
  const [create, update, strong, defaultCreate, defaultUpdate] = commands;
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
    { typeName: "Record" }, driver, "createItem",
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

export const runFileCapabilityDeclarations = async () => {
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
    driver.createItem =
      driver.updateItem =
      driver.readItem =
        async () => {
          throw new Error("UNEXPECTED_IO");
        };
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
