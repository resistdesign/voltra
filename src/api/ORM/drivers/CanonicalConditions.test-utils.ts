import assert from "node:assert/strict";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
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

/** Real generic indexes with intercepted canonical SDK commands; no cloud I/O. */
export const runCloudIndexedWorkflows = async () => {
  const { StructuredInMemoryBackend } =
    await import("./InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend");
  const { createIndexBackend, qualifyIndexField, searchLossy } =
    await import("../../Indexing");
  const { getTypeInfoORMIndexingConfigFromTypeInfoMap } =
    await import("../getTypeInfoORMIndexingConfigFromTypeInfoMap");
  const { DACConstraintType, WILDCARD_SIGNIFIER_PROTOTYPE } =
    await import("../../DataAccessControl");
  const { OperationGroup } = await import("../../../common/TypeInfoORM");
  const { FullTextMemoryBackend } =
    await import("./InMemoryDataItemDBDriver/Indexing/FullTextMemoryBackend");
  const { ComparisonOperators, LogicalOperators } =
    await import("../../../common/SearchTypes");
  const { TypeOperation } =
    await import("../../../common/TypeParsing/TypeInfo");
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
        name: { ...field, tags: { indexed: { exact: true, text: true } } },
        owner: { ...field, optional: true },
        secret: { ...field, optional: true },
      },
    },
  };
  const driver = new DynamoDBDataItemDBDriver<Record<string, any>, "id">({
    tableName: "Records",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => "one",
  });
  let canonical: Record<string, any> | undefined;
  let replaceOwner = false;
  let reads = 0;
  let staleReads = true;
  // A single-record SDK double checks the emitted guards against current state.
  // It deliberately returns stale ordinary reads and has no post-write reader.
  (driver as any).dynamoDBClient.send = async (command: any) => {
    const input = command.input;
    if (command.constructor.name === "GetItemCommand") {
      reads++;
      return (input.ConsistentRead || !staleReads) && canonical
        ? { Item: marshall(canonical) }
        : {};
    }
    if (command.constructor.name === "ScanCommand")
      return { Items: canonical ? [marshall(canonical)] : [] };
    if (replaceOwner) {
      canonical = { ...canonical, owner: "bob" };
      replaceOwner = false;
    }
    const names = input.ExpressionAttributeNames ?? {};
    const vals = input.ExpressionAttributeValues
      ? unmarshall(input.ExpressionAttributeValues)
      : {};
    for (const condition of (input.ConditionExpression ?? "")
      .split(" AND ")
      .filter(Boolean)) {
      const eq = condition.match(/^(#[\w]+) = (:[\w]+)$/);
      const exists = condition.match(/^attribute_(not_)?exists\((#[\w]+)\)$/);
      const valid = eq
        ? JSON.stringify(canonical?.[names[eq[1]]]) ===
          JSON.stringify(vals[eq[2]])
        : exists
          ? (canonical?.[names[exists[2]]] !== undefined) === !exists[1]
          : false;
      assert.ok(eq || exists, `Unhandled emitted condition: ${condition}`);
      if (!valid)
        throw Object.assign(new Error("changed"), {
          name: "ConditionalCheckFailedException",
        });
    }
    const before = canonical && structuredClone(canonical);
    if (command.constructor.name === "PutItemCommand")
      canonical = unmarshall(input.Item);
    else if (command.constructor.name === "UpdateItemCommand") {
      const next = { ...canonical };
      for (const match of input.UpdateExpression.matchAll(
        /(#[\w]+) = (:[\w]+)/g,
      ))
        next[names[match[1]]] = vals[match[2]];
      canonical = next;
    } else if (command.constructor.name === "DeleteItemCommand")
      canonical = undefined;
    else throw new Error(`Unexpected command ${command.constructor.name}`);
    return {
      Attributes:
        input.ReturnValues === "ALL_NEW"
          ? canonical && marshall(canonical)
          : before && marshall(before),
    };
  };
  const values = new StructuredInMemoryBackend();
  const text = new FullTextMemoryBackend();
  const orm = new TypeInfoORMService({
    useDAC: true,
    typeInfoMap,
    getDriver: () => driver,
    getRelationshipDriver: () => {
      throw new Error("unused");
    },
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({ values, valueWriter: values, text }),
    }),
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      getOwnerPrefix: async (_type, _id, snapshot) => [
        snapshot?.owner ?? canonical?.owner ?? "alice",
      ],
      getDACRoleById: async (id) => ({
        id,
        constraints: [
          {
            type: DACConstraintType.ALLOW,
            pathIsPrefix: true,
            resourcePath: [
              "ORM",
              "alice",
              OperationGroup.ALL_OPERATIONS,
              "Record",
              WILDCARD_SIGNIFIER_PROTOTYPE,
            ],
          },
          {
            type: DACConstraintType.DENY,
            pathIsPrefix: true,
            resourcePath: [
              "ORM",
              "alice",
              TypeOperation.READ,
              "Record",
              WILDCARD_SIGNIFIER_PROTOTYPE,
              "secret",
              WILDCARD_SIGNIFIER_PROTOTYPE,
            ],
          },
        ],
      }),
    },
  });
  (orm as any).cleanupRelationships = async () => undefined;
  const context = { accessingRoleId: "alice" };
  const ids = async (name: string) =>
    (await values.terms.query(qualifyIndexField("Record", "name"), "eq", name))
      .candidateIds;
  await orm.create(
    "Record",
    { name: "first", owner: "alice" },
    { ifAbsent: true },
  );
  assert.deepEqual(await ids("first"), ["one"]);
  await assert.rejects(
    () =>
      orm.create(
        "Record",
        { name: "loser", owner: "alice" },
        { ifAbsent: true },
      ),
    { message: "CONDITIONAL_WRITE_CONFLICT" },
  );
  await orm.create("Record", { name: "overwrite", owner: "alice" });
  assert.deepEqual(await ids("first"), []);
  await orm.update(
    "Record",
    { id: "one", name: "ordinary" },
    undefined,
    context,
  );
  const beforeReads = reads;
  await orm.update(
    "Record",
    { id: "one", name: "guarded" },
    { preconditions: { expected: { name: "ordinary" } } },
    context,
  );
  assert.equal(reads, beforeReads + 1); // one authoritative prior, no post-read
  assert.deepEqual(canonical, { id: "one", name: "guarded", owner: "alice" });
  assert.deepEqual(await ids("ordinary"), []);
  assert.deepEqual(await ids("guarded"), ["one"]);
  assert.deepEqual(
    await orm.read("Record", "one", ["name"], context, {
      consistency: "strong",
    }),
    { id: "one", name: "guarded" },
  );
  await assert.rejects(
    () =>
      orm.update(
        "Record",
        { id: "one", name: "loser" },
        { preconditions: { expected: { name: "old" } } },
        context,
      ),
    { message: "CONDITIONAL_WRITE_CONFLICT" },
  );
  assert.deepEqual(await ids("loser"), []);
  Object.assign(canonical!, { secret: "hidden" });
  for (const secret of ["hidden", "guess"]) {
    await assert.rejects(
      () =>
        orm.update(
          "Record",
          { id: "one", name: "probe" },
          {
            preconditions: { expected: { secret } },
          },
          context,
        ),
      { message: "INVALID_OPERATION" },
    );
  }
  assert.deepEqual(
    (
      await searchLossy({
        backend: text,
        indexField: qualifyIndexField("Record", "name"),
        query: "guarded",
        limit: 10,
      })
    ).docIds,
    ["one"],
  );
  staleReads = false;
  const search = await orm.list(
    "Record",
    {
      criteria: {
        logicalOperator: LogicalOperators.AND,
        fieldCriteria: [
          {
            fieldName: "name",
            operator: ComparisonOperators.EQUALS,
            value: "guarded",
          },
        ],
      },
    },
    undefined,
    context,
  );
  assert.equal(search.items[0]?.name, "guarded");
  staleReads = true;
  // Ownership changes after asynchronous DAC inspection must fail atomically.
  replaceOwner = true;
  await assert.rejects(
    () =>
      orm.update(
        "Record",
        { id: "one", name: "unauthorized" },
        undefined,
        context,
      ),
    { message: "CONDITIONAL_WRITE_CONFLICT" },
  );
  assert.equal(canonical!.owner, "bob");
  assert.equal(canonical!.name, "guarded");
  await assert.rejects(
    () =>
      orm.update(
        "Record",
        { id: "one", name: "unauthorized" },
        undefined,
        context,
      ),
    { message: "INVALID_OPERATION" },
  );
  canonical!.owner = "alice";
  await orm.reindexStoredItem("Record", "one");
  assert.equal(
    (await orm.verifyStoredItemForIndexMaintenance("Record", "one")).exists,
    true,
  );
  assert.equal(
    (await orm.cleanupOrphanedIndexState("Record", "one")).status,
    "canonicalExists",
  );
  assert.equal(
    (await orm.reconcileStoredTypeIndexesPage("Record")).processedCount,
    1,
  );
  const failure = new Error("INDEX_OFFLINE");
  const write = values.write.bind(values);
  values.write = async () => {
    throw failure;
  };
  await assert.rejects(
    () =>
      orm.update(
        "Record",
        { id: "one", name: "committed" },
        undefined,
        context,
      ),
    (error: any) =>
      error.canonicalCommitted === true && error.cause === failure,
  );
  assert.equal(canonical!.name, "committed");
  values.write = write;
  await orm.reindexStoredItem("Record", "one", {
    previousItem: { id: "one", name: "guarded" },
  });
  assert.deepEqual(await ids("committed"), ["one"]);
  // Delete also binds inspected ownership, without deleting the changed owner.
  replaceOwner = true;
  await assert.rejects(() => orm.delete("Record", "one", context), {
    message: "CONDITIONAL_WRITE_CONFLICT",
  });
  assert.equal(canonical!.owner, "bob");
  canonical!.owner = "alice";
  await orm.delete("Record", "one", context);
  assert.equal(canonical, undefined);
  assert.deepEqual(await ids("committed"), []);
  await values.write("one", {
    [qualifyIndexField("Record", "name")]: "orphan",
  });
  assert.equal(
    (await orm.cleanupOrphanedIndexState("Record", "one")).status,
    "maintenanceUnsupported",
  );
  assert.deepEqual(await ids("orphan"), ["one"]);
  // Recreated canonical state is repaired, never treated as an absent orphan.
  await orm.create("Record", { name: "recreated", owner: "alice" });
  assert.equal(
    (await orm.cleanupOrphanedIndexState("Record", "one")).status,
    "canonicalExists",
  );
  assert.deepEqual(await ids("recreated"), ["one"]);
  return { verified: true };
};

/** S3 indexed CRUD/reindex remains usable; only specific atomic/DAC cases refuse. */
export const runS3IndexedWorkflows = async () => {
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
        name: { ...field, tags: { indexed: { exact: true } } },
      },
    },
  };
  const driver = new S3FileItemDBDriver({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: { bucketName: "test", s3Config: {} },
  });
  const files = new Set<string>();
  let expectedCopySourceKey = "Files/first";
  (driver as any).s3.send = async (command: any) => {
    const { Bucket, Key, CopySource } = command.input;
    assert.equal(Bucket, "test");
    if (command.constructor.name === "HeadObjectCommand") {
      if (!files.has(Key))
        throw Object.assign(new Error("missing"), { name: "NotFound" });
      return {
        ContentLength: 7,
        ContentType: "text/plain",
        LastModified: new Date(1000),
      };
    }
    if (command.constructor.name === "CopyObjectCommand") {
      const [sourceBucket, ...sourceKeyParts] = CopySource.split("/");
      assert.equal(decodeURIComponent(sourceBucket), "test");
      assert.doesNotMatch(CopySource, /[ #?é]/);
      const sourceKey = decodeURIComponent(sourceKeyParts.join("/"));
      assert.equal(sourceKey, expectedCopySourceKey);
      assert.ok(files.has(sourceKey));
      assert.notEqual(sourceKey, Key);
    } else assert.equal(command.constructor.name, "PutObjectCommand");
    files.add(Key);
    return {};
  };
  (driver as any).s3FileDriver.deleteFile = async (loc: any, table: string) => {
    files.delete(`${table}/${loc.name}`);
  };
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
  (orm as any).cleanupRelationships = async () => undefined;
  const ids = async (name: string) =>
    (await values.terms.query(qualifyIndexField("File", "name"), "eq", name))
      .candidateIds;
  await orm.create("File", { name: "first" });
  assert.deepEqual(await ids("first"), ["first"]);
  await orm.update("File", { id: "first", name: "next" });
  assert.deepEqual(await ids("first"), []);
  assert.deepEqual(await ids("next"), ["next"]);
  const encodedName = "first #?%25 café.txt";
  await orm.create("File", { name: encodedName });
  expectedCopySourceKey = `Files/${encodedName}`;
  await orm.update("File", { id: encodedName, name: "encoded-next" });
  assert.equal(files.has(`Files/${encodedName}`), false);
  assert.ok(files.has("Files/encoded-next"));
  assert.deepEqual(await ids(encodedName), []);
  assert.deepEqual(await ids("encoded-next"), ["encoded-next"]);
  await orm.delete("File", "encoded-next");
  assert.equal(files.has("Files/encoded-next"), false);
  assert.deepEqual(await ids("encoded-next"), []);
  await orm.reindexStoredItem("File", "next");
  assert.equal(
    (await orm.cleanupOrphanedIndexState("File", "next")).status,
    "canonicalExists",
  );
  // Location-only DAC observations can be honored; mutable metadata cannot.
  let inspected = false;
  await driver.updateItem(
    "next",
    { name: "next" },
    {
      coordination: {
        guardFields: ["id", "name"],
        inspect: async (item) => {
          assert.equal(item!.id, "next");
          inspected = true;
        },
      },
    },
  );
  assert.equal(inspected, true);
  await assert.rejects(
    () =>
      driver.updateItem(
        "next",
        { name: "next" },
        {
          coordination: {
            guardFields: ["mimeType"],
            inspect: async () => {
              throw new Error("UNSAFE_INSPECTION");
            },
          },
        },
      ),
    { message: "UNSUPPORTED_CAPABILITY" },
  );
  await orm.delete("File", "next");
  assert.deepEqual(await ids("next"), []);
  assert.equal(
    (await orm.cleanupOrphanedIndexState("File", "next")).status,
    "maintenanceUnsupported",
  );
  const failure = new Error("INDEX_OFFLINE");
  values.write = async () => {
    throw failure;
  };
  await assert.rejects(
    () => orm.create("File", { name: "committed" }),
    (error: any) =>
      error.canonicalCommitted === true && error.cause === failure,
  );
  assert.ok(files.has("Files/committed"));
  return { verified: true };
};

/** Ordinary S3 no-op updates validate existence and preserve the canonical object. */
export const runS3UncoordinatedNoOpUpdates = async () => {
  const field = {
    type: "string" as const,
    optional: false,
    readonly: false,
    array: false,
  };
  const driver = new S3FileItemDBDriver({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: { bucketName: "test", s3Config: {} },
  });
  const files = new Map([["Files/folder/present", "original contents"]]);
  (driver as any).s3.send = async (command: any) => {
    assert.equal(command.constructor.name, "HeadObjectCommand");
    assert.equal(command.input.Bucket, "test");
    if (!files.has(command.input.Key))
      throw Object.assign(new Error("missing"), { name: "NotFound" });
    return { ContentLength: 17, ContentType: "text/plain" };
  };
  (driver as any).s3FileDriver.deleteFile = async () => {
    throw new Error("NO_OP_MUST_NOT_DELETE");
  };
  const update = driver.updateItem;
  driver.updateItem = (id, item, config) => {
    assert.equal(config?.coordination, undefined);
    return update(id, item, config);
  };
  const orm = new TypeInfoORMService({
    useDAC: false,
    typeInfoMap: {
      File: {
        primaryField: "id",
        fields: {
          id: field,
          name: field,
          directory: { ...field, optional: true },
        },
      },
    },
    getDriver: () => driver,
    getRelationshipDriver: () => {
      throw new Error("unused");
    },
  });
  const presentPayloads: Record<string, string>[] = [{ name: "present" }, {}];
  for (const payload of presentPayloads) {
    assert.equal(
      await orm.update("File", { id: "folder/present", ...payload }),
      true,
    );
    assert.deepEqual(
      [...files],
      [["Files/folder/present", "original contents"]],
    );
  }
  const missingPayloads: Record<string, string>[] = [{ name: "missing" }, {}];
  for (const payload of missingPayloads) {
    await assert.rejects(
      () => orm.update("File", { id: "folder/missing", ...payload }),
      { message: "ITEM_NOT_FOUND" },
    );
    assert.equal(files.has("Files/folder/missing"), false);
    assert.deepEqual(
      [...files],
      [["Files/folder/present", "original contents"]],
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

/** S3 renames cannot overwrite identities outside the caller's DAC authority. */
export const runS3RenameDestinationProtection = async () => {
  const { StructuredInMemoryBackend } =
    await import("./InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend");
  const { createIndexBackend, qualifyIndexField } =
    await import("../../Indexing");
  const { getTypeInfoORMIndexingConfigFromTypeInfoMap } =
    await import("../getTypeInfoORMIndexingConfigFromTypeInfoMap");
  const { DACConstraintType } = await import("../../DataAccessControl");
  const { OperationGroup } = await import("../../../common/TypeInfoORM");
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
        name: { ...field, tags: { indexed: { exact: true } } },
        directory: { ...field, optional: true },
      },
    },
  };
  const driver = new S3FileItemDBDriver({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: { bucketName: "test", s3Config: {} },
  });
  const files = new Map<string, string>();
  let copyFailure: Error | undefined;
  let occupyAtCopy = false;
  (driver as any).s3.send = async (command: any) => {
    const { Bucket, Key, CopySource, IfNoneMatch } = command.input;
    assert.equal(Bucket, "test");
    switch (command.constructor.name) {
      case "HeadObjectCommand":
        if (!files.has(Key))
          throw Object.assign(new Error("missing"), { name: "NotFound" });
        return {
          ContentLength: files.get(Key)!.length,
          ContentType: "text/plain",
          LastModified: new Date(1000),
        };
      case "PutObjectCommand":
        files.set(Key, `${Key} original contents`);
        return {};
      case "CopyObjectCommand": {
        const source = decodeURIComponent(
          CopySource.split("/").slice(1).join("/"),
        );
        assert.ok(files.has(source));
        // Model an object arriving at the mutation boundary, after inspection.
        if (occupyAtCopy) files.set(Key, "concurrent protected contents");
        if (IfNoneMatch === "*" && files.has(Key)) {
          copyFailure = Object.assign(new Error("destination exists"), {
            name: "PreconditionFailed",
            $metadata: { httpStatusCode: 412 },
          });
          throw copyFailure;
        }
        files.set(Key, files.get(source)!);
        return {};
      }
      default:
        throw new Error(`Unexpected command ${command.constructor.name}`);
    }
  };
  (driver as any).s3FileDriver.deleteFile = async (loc: any, table: string) => {
    files.delete(`${table}/${loc.name}`);
  };
  const values = new StructuredInMemoryBackend();
  const orm = new TypeInfoORMService({
    useDAC: true,
    typeInfoMap,
    getDriver: () => driver,
    getRelationshipDriver: () => {
      throw new Error("unused");
    },
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({ values, valueWriter: values }),
    }),
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      getOwnerPrefix: async () => ["owner"],
      getDACRoleById: async (id) => ({
        id,
        constraints: ["mine", "renamed"]
          .map((identity) => ({
            type: DACConstraintType.ALLOW,
            pathIsPrefix: true,
            resourcePath: [
              "ORM",
              "owner",
              OperationGroup.ALL_OPERATIONS,
              "File",
              identity,
            ],
          }))
          .concat([
            {
              type: DACConstraintType.DENY,
              pathIsPrefix: true,
              resourcePath: [
                "ORM",
                "owner",
                OperationGroup.ALL_OPERATIONS,
                "File",
                "protected",
              ],
            },
          ]),
      }),
    },
  });
  const caller = { accessingRoleId: "caller" };
  await orm.create("File", { name: "mine" });
  await orm.create("File", { name: "protected" });
  await assert.rejects(() => orm.read("File", "protected", undefined, caller));
  const ids = async (name: string) =>
    (await values.terms.query(qualifyIndexField("File", "name"), "eq", name))
      .candidateIds;
  const beforeFiles = new Map(files);
  const beforeIndexes = await Promise.all([
    ids("mine"),
    ids("protected"),
    ids("renamed"),
  ]);
  const rejectRename = () =>
    assert.rejects(
      () =>
        orm.update(
          "File",
          { id: "mine", name: "protected" },
          undefined,
          caller,
        ),
      (error: any) =>
        error.message === "CONDITIONAL_WRITE_CONFLICT" &&
        error.cause === copyFailure &&
        error.canonicalCommitted !== true,
    );
  await rejectRename();
  assert.deepEqual(files, beforeFiles);
  assert.deepEqual(
    await Promise.all([ids("mine"), ids("protected"), ids("renamed")]),
    beforeIndexes,
  );
  // No preflight existence check can substitute for the conditional copy.
  files.delete("Files/protected");
  occupyAtCopy = true;
  await rejectRename();
  assert.equal(files.get("Files/mine"), beforeFiles.get("Files/mine"));
  assert.equal(files.get("Files/protected"), "concurrent protected contents");
  assert.deepEqual(
    await Promise.all([ids("mine"), ids("protected"), ids("renamed")]),
    beforeIndexes,
  );
  occupyAtCopy = false;
  await orm.update("File", { id: "mine", name: "renamed" }, undefined, caller);
  assert.equal(files.has("Files/mine"), false);
  assert.equal(files.get("Files/renamed"), beforeFiles.get("Files/mine"));
  assert.equal(files.get("Files/protected"), "concurrent protected contents");
  assert.deepEqual(await ids("mine"), []);
  assert.deepEqual(await ids("renamed"), ["renamed"]);
  assert.deepEqual(await ids("protected"), ["protected"]);
  return { verified: true };
};
