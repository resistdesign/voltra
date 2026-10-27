import assert from "node:assert/strict";
import { TypeInfoORMService } from "../TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "../drivers/InMemoryDataItemDBDriver";
import { StructuredInMemoryBackend } from "../drivers/InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend";
import { qualifyIndexField } from "../../Indexing/fieldQualification";
import { createIndexBackend } from "../../Indexing/query";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "../getTypeInfoORMIndexingConfigFromTypeInfoMap";
import {
  TypeInfoORMServiceError,
  TypeInfoORMUpdateOperators,
  OperationGroup,
} from "../../../common/TypeInfoORM";
import {
  TypeInfoMap,
  TypeOperation,
} from "../../../common/TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../../common/SearchTypes";
import {
  DACConstraintType,
  WILDCARD_SIGNIFIER_PROTOTYPE,
} from "../../DataAccessControl";
import type { DataItemDBDriver } from "../drivers/common/Types";

type Item = { id: string; name: string; score: number; secret?: string };
const field = (type: "string" | "number", optional = false) => ({
  type,
  optional,
  array: false,
  readonly: false,
});
const typeInfoMap: TypeInfoMap = {
  Record: {
    primaryField: "id",
    fields: {
      id: { ...field("string"), tags: { primaryField: true } },
      name: { ...field("string"), tags: { indexed: { exact: true } } },
      score: field("number"),
      secret: field("string", true),
    },
  },
};
const makeDriver = () =>
  new InMemoryDataItemDBDriver<Item, "id">({
    tableName: "Record",
    uniquelyIdentifyingFieldName: "id",
    generateUniqueIdentifier: () => "one",
  });
const config = (driver: DataItemDBDriver<any, any>) => ({
  typeInfoMap,
  useDAC: false as const,
  getDriver: () => driver,
  getRelationshipDriver: () => {
    throw new Error("unused");
  },
});
const errorOf = async (call: () => Promise<unknown>) => {
  try {
    await call();
    return "NO_ERROR";
  } catch (error: any) {
    return error.message ?? error.error?.code;
  }
};

export const runConditionalCanonicalWrites = async () => {
  const driver = makeDriver();
  const orm = new TypeInfoORMService(config(driver));
  const creates = await Promise.allSettled([
    orm.create("Record", { name: "winner", score: 0 }, { ifAbsent: true }),
    orm.create("Record", { name: "loser", score: 99 }, { ifAbsent: true }),
  ]);
  const missing = await errorOf(() =>
    orm.update(
      "Record",
      { id: "missing", name: "upsert" },
      { preconditions: { exists: true } },
    ),
  );
  const stale = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", name: "loser" },
      { preconditions: { expected: { score: 5 } } },
    ),
  );
  const before = await orm.read("Record", "one");
  // Both contenders expect the same version. Only one increment may win.
  const updates = await Promise.allSettled(
    [1, 2].map(() =>
      orm.update(
        "Record",
        { id: "one", score: 1 },
        {
          preconditions: { expected: { score: 0, name: "winner" } },
          fieldOperators: {
            score: TypeInfoORMUpdateOperators.NUMBER.INCREMENT,
          },
        },
      ),
    ),
  );
  const invalid = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", score: 2 },
      { preconditions: { expected: { score: "wrong type" } } },
    ),
  );
  const unknown = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", score: 2 },
      { preconditions: { expected: { typo: 0 } } },
    ),
  );
  return {
    createStatuses: creates.map((result) => result.status),
    conflict:
      creates[1].status === "rejected" ? creates[1].reason.message : "NO_ERROR",
    missing,
    stale,
    before,
    updateStatuses: updates.map((result) => result.status),
    after: await orm.read("Record", "one"),
    invalid,
    unknown,
    noUpsert: await errorOf(() => driver.readItem("missing")),
  };
};

export const runConditionalIndexSafetyAndRecovery = async () => {
  const driver = makeDriver();
  const values = new StructuredInMemoryBackend();
  const backend = createIndexBackend({ values, valueWriter: values });
  const orm = new TypeInfoORMService({
    ...config(driver),
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend,
    }),
  });
  const find = async (name: string) =>
    (
      await orm.list(
        "Record",
        {
          itemsPerPage: 10,
          criteria: {
            logicalOperator: LogicalOperators.AND,
            fieldCriteria: [
              {
                fieldName: "name",
                operator: ComparisonOperators.EQUALS,
                value: name,
              },
            ],
          },
        },
        ["id"],
      )
    ).items.map((item) => item.id);
  await orm.create("Record", { name: "winner", score: 0 }, { ifAbsent: true });
  const createConflict = await errorOf(() =>
    orm.create("Record", { name: "loser", score: 9 }, { ifAbsent: true }),
  );
  const updateConflict = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", name: "loser" },
      { preconditions: { expected: { score: 9 } } },
    ),
  );
  const losingIds = await find("loser");
  const winnerIds = await find("winner");
  const previousItem = await orm.read("Record", "one", undefined, undefined, {
    consistency: "strong",
  });
  // Fault injection at the existing index writer boundary, after canonical commit.
  const write = values.write.bind(values);
  values.write = async () => {
    throw new Error("INDEX_UNAVAILABLE");
  };
  const indexFailure = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", name: "committed" },
      { preconditions: { expected: { name: "winner" } } },
    ),
  );
  const canonical = await orm.read("Record", "one", undefined, undefined, {
    consistency: "strong",
  });
  values.write = write;
  const readItem = driver.readItem;
  let maintenanceReads = 0;
  driver.readItem = async (id, selected, readConfig) => {
    assert.ok(readConfig?.consistency === "strong" || readConfig?.coordination);
    maintenanceReads++;
    return readItem(id, selected, readConfig);
  };
  const verification = await orm.verifyStoredItemForIndexMaintenance(
    "Record",
    "one",
  );
  await orm.reindexStoredItem("Record", "one", { previousItem });
  assert.equal(maintenanceReads, 2);
  driver.readItem = readItem;
  return {
    createConflict,
    updateConflict,
    losingIds,
    winnerIds,
    indexFailure,
    canonical,
    consistency: verification.consistency,
    repairedIds: await find("committed"),
    staleIds: await find("winner"),
  };
};

export const runStrongReadAndUnsupported = async () => {
  const driver = makeDriver();
  await driver.createItem({ name: "visible", score: 0, secret: "hidden" });
  const selections: unknown[] = [];
  let ordinaryReads = 0;
  const read = driver.readItem;
  // Receiver and config must survive the normal CRUD error wrapper.
  driver.readItem = async function (id, selected, readConfig) {
    if (this !== driver) throw new Error("LOST_RECEIVER");
    if (readConfig?.consistency === "strong")
      selections.push(selected ?? "ALL");
    else ordinaryReads++;
    return read(id, selected, readConfig);
  };
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
  const orm = new TypeInfoORMService({
    ...config(driver),
    useDAC: true,
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      getDACRoleById: async (id) => ({
        id,
        constraints:
          id === "allowed"
            ? [
                {
                  type: DACConstraintType.ALLOW,
                  pathIsPrefix: true,
                  resourcePath: [
                    "ORM",
                    OperationGroup.ALL_OPERATIONS,
                    "Record",
                    wildcard,
                  ],
                },
                {
                  type: DACConstraintType.DENY,
                  pathIsPrefix: true,
                  resourcePath: [
                    "ORM",
                    TypeOperation.READ,
                    "Record",
                    wildcard,
                    "secret",
                    wildcard,
                  ],
                },
              ]
            : [],
      }),
    },
  });
  const context = { accessingRoleId: "allowed" };
  const strong = { consistency: "strong" } as const;
  const projected = await orm.read(
    "Record",
    "one",
    ["name", "secret"],
    context,
    strong,
  );
  const denied = await errorOf(() =>
    orm.read("Record", "one", ["name"], { accessingRoleId: "denied" }, strong),
  );
  const updateDenied = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", score: 2 },
      { preconditions: { exists: true } },
      { accessingRoleId: "denied" },
    ),
  );
  const missingContext = await errorOf(() =>
    orm.read("Record", "one", ["name"], undefined, strong),
  );
  let wrappedFailure: unknown;
  try {
    await orm.read("Record", "missing", ["name"], context, strong);
  } catch (error: any) {
    wrappedFailure = { message: error.message, typeName: error.typeName };
  }
  const restricted: DataItemDBDriver<Item, "id"> = {
    createItem: async (item, options) => {
      if (options?.ifAbsent) throw new Error("UNSUPPORTED_CAPABILITY");
      return driver.createItem(item, options);
    },
    readItem: async (id, selected, options) => {
      if (options?.consistency === "strong")
        throw new Error("UNSUPPORTED_CAPABILITY");
      return driver.readItem.call(driver, id, selected, options);
    },
    updateItem: async (id, item, options) => {
      if (options?.preconditions) throw new Error("UNSUPPORTED_CAPABILITY");
      return driver.updateItem(id, item, options);
    },
    deleteItem: driver.deleteItem,
    listItems: driver.listItems,
  };
  const unsupported = new TypeInfoORMService(config(restricted));
  const failures = await Promise.all([
    errorOf(() =>
      unsupported.read("Record", "one", undefined, undefined, strong),
    ),
    errorOf(() =>
      unsupported.create(
        "Record",
        { name: "loser", score: 1 },
        { ifAbsent: true },
      ),
    ),
    errorOf(() =>
      unsupported.update(
        "Record",
        { id: "one", name: "loser" },
        { preconditions: { exists: true } },
      ),
    ),
  ]);
  const strongOrdinaryReads = ordinaryReads;
  // Unconfigured operations still permit overwrite and upsert.
  await unsupported.create("Record", { name: "default", score: 2 });
  await unsupported.update("Record", { id: "new", name: "upsert" });
  return {
    projected,
    selections,
    denied,
    updateDenied,
    missingContext,
    failures,
    strongOrdinaryReads,
    wrappedFailure,
    overwritten: await unsupported.read("Record", "one", ["name"]),
    upserted: await unsupported.read("Record", "new", ["name"]),
  };
};

/** Guard comparisons must respect read permissions independently of patch permissions. */
export const runConditionalGuardReadAccess = async () => {
  const driver = makeDriver();
  const values = new StructuredInMemoryBackend();
  const backend = createIndexBackend({ values, valueWriter: values });
  const guardedTypes: TypeInfoMap = {
    Record: {
      ...typeInfoMap.Record,
      fields: {
        ...typeInfoMap.Record.fields,
        score: { ...field("number"), readonly: true },
      },
    },
  };
  const base = {
    ...config(driver),
    typeInfoMap: guardedTypes,
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(guardedTypes, {
      backend,
    }),
  };
  const admin = new TypeInfoORMService(base);
  await admin.create("Record", { name: "visible", score: 0, secret: "hidden" });
  const wildcard = WILDCARD_SIGNIFIER_PROTOTYPE;
  const orm = new TypeInfoORMService({
    ...base,
    useDAC: true,
    dacConfig: {
      itemResourcePathPrefix: ["ORM"],
      relationshipResourcePathPrefix: ["REL"],
      getDACRoleById: async (id) => ({
        id,
        constraints: [
          ...[TypeOperation.READ, TypeOperation.UPDATE].map((operation) => ({
            type: DACConstraintType.ALLOW,
            pathIsPrefix: true,
            resourcePath: ["ORM", operation, "Record", wildcard],
          })),
          {
            type: DACConstraintType.DENY,
            pathIsPrefix: true,
            resourcePath: [
              "ORM",
              TypeOperation.READ,
              "Record",
              wildcard,
              "secret",
              id === "value-reader" ? "hidden" : wildcard,
            ],
          },
          {
            type: DACConstraintType.DENY,
            pathIsPrefix: true,
            resourcePath: [
              "ORM",
              TypeOperation.UPDATE,
              "Record",
              wildcard,
              "score",
              wildcard,
            ],
          },
        ],
      }),
    },
  });
  const context = { accessingRoleId: "editor" };
  const guesses = [];
  // Cover field-wide denial and denial constrained to the stored value.
  for (const accessingRoleId of ["editor", "value-reader"]) {
    for (const secret of ["hidden", "wrong"]) {
      guesses.push(
        await errorOf(() =>
          orm.update(
            "Record",
            { id: "one", name: "loser" },
            { preconditions: { expected: { secret } } },
            { accessingRoleId },
          ),
        ),
      );
    }
  }
  const before = await admin.read("Record", "one");
  const find = async (name: string) =>
    (
      await admin.list(
        "Record",
        {
          itemsPerPage: 10,
          criteria: {
            logicalOperator: LogicalOperators.AND,
            fieldCriteria: [
              {
                fieldName: "name",
                operator: ComparisonOperators.EQUALS,
                value: name,
              },
            ],
          },
        },
        ["id"],
      )
    ).items.map((item) => item.id);
  const losingIds = await find("loser");
  const visibleIds = await find("visible");
  const permitted = await orm.update(
    "Record",
    { id: "one", name: "permitted" },
    { preconditions: { expected: { name: "visible", score: 0 } } },
    context,
  );
  const stale = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", name: "loser" },
      { preconditions: { expected: { name: "visible" } } },
      context,
    ),
  );
  return {
    guesses,
    before,
    losingIds,
    visibleIds,
    permitted,
    stale,
    after: await admin.read("Record", "one"),
    permittedIds: await find("permitted"),
    staleIds: await find("visible"),
  };
};

/** Guarded reindexing must use current snapshots even if ordinary reads lag. */
export const runGuardedStaleReads = async () => {
  const driver = makeDriver();
  const values = new StructuredInMemoryBackend();
  const backend = createIndexBackend({ values, valueWriter: values });
  const orm = new TypeInfoORMService({
    ...config(driver),
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend,
    }),
  });
  await orm.create("Record", { name: "obsolete", score: 0 });
  const read = driver.readItem;
  const obsolete = await read("one");
  await orm.update("Record", { id: "one", name: "current" });
  let ordinaryReads = 0;
  driver.readItem = async (id, selected, readConfig) => {
    if (readConfig?.consistency === "strong")
      return read(id, selected, readConfig);
    ordinaryReads++;
    return obsolete;
  };
  await orm.update(
    "Record",
    { id: "one", name: "committed", score: 1 },
    { preconditions: { expected: { name: "current", score: 0 } } },
  );
  driver.readItem = read;
  // Inspect persisted postings directly so canonical filtering cannot hide debris.
  for (const name of ["obsolete", "current", "committed"]) {
    const postings = await values.terms.query(
      qualifyIndexField("Record", "name"),
      "eq",
      name,
    );
    assert.equal(postings.candidateIds.length, name === "committed" ? 1 : 0);
  }
  const find = async (name: string) =>
    (
      await orm.list(
        "Record",
        {
          itemsPerPage: 10,
          criteria: {
            logicalOperator: LogicalOperators.AND,
            fieldCriteria: [
              {
                fieldName: "name",
                operator: ComparisonOperators.EQUALS,
                value: name,
              },
            ],
          },
        },
        ["id"],
      )
    ).items.map((item) => item.id);
  return {
    ordinaryReads,
    canonical: await read("one"),
    obsoleteIds: await find("obsolete"),
    currentIds: await find("current"),
    committedIds: await find("committed"),
  };
};

/** A driver may return false for a lost guard; no post-write work may follow. */
export const runConditionalFalseResult = async () => {
  const item = { id: "one", name: "winner", score: 0 };
  let reads = 0;
  let mutations = 0;
  let indexWork = 0;
  const driver: DataItemDBDriver<Item, "id"> = {
    createItem: async () => "one",
    readItem: async (_id, _selected, readConfig) => {
      assert.equal(readConfig?.consistency, "strong");
      reads++;
      return { ...item };
    },
    updateItem: async (_id, _patch, options) => {
      if (!options?.preconditions) throw new Error("MISSING_GUARD");
      mutations++;
      return false;
    },
    deleteItem: async () => true,
    listItems: async () => ({ items: [] }),
  };
  const values = new StructuredInMemoryBackend();
  const indexing = getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
    backend: createIndexBackend({ values, valueWriter: values }),
  });
  const orm = new TypeInfoORMService({ ...config(driver), indexing });
  // Observe both index entry points independently of any backend's no-op behavior.
  (orm as any).replaceItemIndexes = (orm as any).indexItemIndexes =
    async () => {
      indexWork++;
    };
  const conflict = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", name: "loser" },
      { preconditions: { exists: true } },
    ),
  );
  return { conflict, reads, mutations, indexWork, canonical: item };
};

/** Atomic no-index guards do not depend on the optional strong reader. */
export const runConditionalWithoutStrongReader = async () => {
  const storage = makeDriver();
  const driver: DataItemDBDriver<Item, "id"> = {
    createItem: storage.createItem.bind(storage),
    readItem: storage.readItem.bind(storage),
    updateItem: storage.updateItem.bind(storage),
    deleteItem: storage.deleteItem.bind(storage),
    listItems: storage.listItems.bind(storage),
  };
  const orm = new TypeInfoORMService(config(driver));
  await orm.create("Record", { name: "initial", score: 0 });
  const exists = await orm.update(
    "Record",
    { id: "one", name: "winner" },
    { preconditions: { exists: true } },
  );
  const expected = await orm.update(
    "Record",
    { id: "one", score: 1 },
    { preconditions: { expected: { score: 0 } } },
  );
  const stale = await errorOf(() =>
    orm.update(
      "Record",
      { id: "one", name: "loser" },
      { preconditions: { expected: { score: 0 } } },
    ),
  );
  const missing = await errorOf(() =>
    orm.update(
      "Record",
      { id: "missing", name: "upsert" },
      { preconditions: { exists: true } },
    ),
  );
  // Preserve normalization for drivers that signal a lost guard with false.
  const falseResult = new TypeInfoORMService(
    config({
      ...driver,
      updateItem: async () => false,
    }),
  );
  const conflict = await errorOf(() =>
    falseResult.update(
      "Record",
      { id: "one", name: "loser" },
      { preconditions: { exists: true } },
    ),
  );
  return {
    exists,
    expected,
    stale,
    missing,
    conflict,
    canonical: await orm.read("Record", "one"),
    noUpsert: await errorOf(() => orm.read("Record", "missing")),
  };
};

/** Atomic no-index success must not depend on either reader's availability. */
export const runConditionalWithoutSnapshots = async () => {
  const results = [];
  for (const missingRead of [true, false]) {
    const storage = makeDriver();
    await storage.createItem({ name: "initial", score: 0 });
    let ordinaryReads = 0;
    let strongReads = 0;
    const driver: DataItemDBDriver<Item, "id"> = {
      createItem: storage.createItem.bind(storage),
      readItem: async (_id, _selected, readConfig) => {
        if (readConfig?.consistency === "strong") {
          strongReads++;
          throw new Error("UNEXPECTED_STRONG_READ");
        }
        ordinaryReads++;
        throw new Error(missingRead ? "ITEM_NOT_FOUND" : "UNEXPECTED_READ");
      },
      updateItem: storage.updateItem.bind(storage),
      deleteItem: storage.deleteItem.bind(storage),
      listItems: storage.listItems.bind(storage),
    };
    const orm = new TypeInfoORMService(config(driver));
    const success = await orm.update(
      "Record",
      { id: "one", name: "committed", score: 1 },
      { preconditions: { expected: { score: 0 } } },
    );
    const stale = await errorOf(() =>
      orm.update(
        "Record",
        { id: "one", name: "loser" },
        { preconditions: { expected: { score: 0 } } },
      ),
    );
    const falseResult = new TypeInfoORMService(
      config({
        ...driver,
        updateItem: async () => false,
      }),
    );
    const conflict = await errorOf(() =>
      falseResult.update(
        "Record",
        { id: "one", name: "loser" },
        { preconditions: { exists: true } },
      ),
    );
    assert.equal(success, true);
    assert.equal(stale, TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT);
    assert.equal(conflict, TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT);
    assert.equal(ordinaryReads, 0);
    assert.equal(strongReads, 0);
    assert.deepEqual(await storage.readItem("one"), {
      id: "one",
      name: "committed",
      score: 1,
    });
    assert.equal(
      await orm.update("Record", { id: "one", name: "ordinary" }),
      true,
    );
    assert.equal((await storage.readItem("one")).name, "ordinary");
    assert.equal(ordinaryReads, 0);
    assert.equal(strongReads, 0);
    results.push(success);
  }
  return results;
};

/** Rejections retain provider and JavaScript diagnostics through the ORM wrapper. */
export const runRejectedErrorDiagnostics = async () => {
  const driver = makeDriver();
  await driver.createItem({ name: "winner", score: 0 });
  const provider = Object.assign(new Error("provider failure"), {
    name: "ConditionalCheckFailedException",
    $metadata: { requestId: "request-one", httpStatusCode: 400 },
  });
  const conditional = new Error(
    TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT,
    { cause: provider },
  );
  const infrastructure = new TypeError("NETWORK_UNAVAILABLE", {
    cause: new Error("connection reset"),
  });
  Object.defineProperty(infrastructure, "$metadata", {
    value: { requestId: "request-two" },
  });
  const errors = [
    infrastructure,
    conditional,
    Object.freeze(new RangeError("FROZEN", { cause: provider })),
  ];
  const checks: boolean[] = [];
  for (const error of errors) {
    driver.readItem = async () => {
      throw error;
    };
    driver.updateItem = async () => {
      throw error;
    };
    const orm = new TypeInfoORMService(config(driver));
    try {
      if (error === conditional) {
        await orm.update(
          "Record",
          { id: "one", name: "loser" },
          { preconditions: { exists: true } },
        );
      } else {
        await orm.read("Record", "one");
      }
      checks.push(false);
    } catch (received: any) {
      checks.push(
        received instanceof Error &&
          Object.getPrototypeOf(received) === Object.getPrototypeOf(error) &&
          (Object.isFrozen(error) || received === error) &&
          received.name === error.name &&
          received.stack === error.stack &&
          received.message === error.message &&
          received.cause === error.cause &&
          (received as any).$metadata === (error as any).$metadata &&
          (received.cause as any)?.$metadata ===
            (error.cause as any)?.$metadata &&
          (received as any).typeName === "Record",
      );
    }
  }
  return { checks };
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const indexedStore = () => {
  const driver = makeDriver();
  const values = new StructuredInMemoryBackend();
  const orm = new TypeInfoORMService({
    ...config(driver),
    indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
      backend: createIndexBackend({ values, valueWriter: values }),
    }),
  });
  const ids = async (name: string) =>
    (await values.terms.query(qualifyIndexField("Record", "name"), "eq", name))
      .candidateIds;
  return { driver, values, orm, ids };
};

/** Authoritative mutation images work even when every ordinary read is unusable. */
export const runCoordinatedMutationImages = async () => {
  for (const readFailure of ["ITEM_NOT_FOUND", "READ_UNAVAILABLE", "stale"]) {
    const { driver, orm, ids } = indexedStore();
    const read = driver.readItem;
    driver.readItem = async () => {
      if (readFailure === "stale")
        return { id: "one", name: "obsolete", score: -1 };
      throw new Error(readFailure);
    };
    await orm.create("Record", { name: "old", score: 0 });
    await orm.create("Record", { name: "overwritten", score: 1 });
    assert.deepEqual(await ids("old"), []);
    await orm.update("Record", { id: "one", name: "ordinary" });
    await orm.update(
      "Record",
      { id: "one", name: "guarded" },
      {
        preconditions: { expected: { name: "ordinary" } },
      },
    );
    assert.deepEqual(await read("one"), {
      id: "one",
      name: "guarded",
      score: 1,
    });
    for (const name of ["old", "overwritten", "ordinary", "obsolete"])
      assert.deepEqual(await ids(name), []);
    assert.deepEqual(await ids("guarded"), ["one"]);
    // No relationships exist in this fixture.
    (orm as any).cleanupRelationships = async () => undefined;
    await orm.delete("Record", "one");
    await assert.rejects(() => read("one"), { message: "ITEM_NOT_FOUND" });
    assert.deepEqual(await ids("guarded"), []);
  }
  const { driver, values, orm, ids } = indexedStore();
  await orm.create("Record", { name: "before", score: 0 });
  const reached = deferred();
  const release = deferred();
  const write = values.write.bind(values);
  let pause = true;
  values.write = async (...args) => {
    if (pause) {
      pause = false;
      reached.resolve();
      await release.promise;
    }
    return write(...args);
  };
  const first = orm.update("Record", { id: "one", name: "first" });
  await reached.promise;
  const second = orm.update("Record", { id: "one", name: "second" });
  // A second writer must not overtake the first writer's delayed index write.
  assert.equal((await driver.readItem("one")).name, "first");
  release.resolve();
  await Promise.all([first, second]);
  assert.equal((await driver.readItem("one")).name, "second");
  assert.deepEqual(await ids("first"), []);
  assert.deepEqual(await ids("before"), []);
  assert.deepEqual(await ids("second"), ["one"]);
  values.write = async () => {
    throw new Error("INDEX_UNAVAILABLE");
  };
  await assert.rejects(
    () => orm.update("Record", { id: "one", name: "committed" }),
    (error: any) => {
      assert.equal(error.message, "CANONICAL_WRITE_COMMITTED");
      assert.equal(error.canonicalCommitted, true);
      assert.equal(error.before, undefined);
      assert.equal(error.after, undefined);
      assert.equal(error.cause.message, "INDEX_UNAVAILABLE");
      return true;
    },
  );
  assert.equal((await driver.readItem("one")).name, "committed");
  return { verified: true };
};

/** Competing replacements cannot invalidate authorization between inspection and commit. */
export const runCoordinatedAuthorization = async () => {
  for (const operation of ["guarded", "ordinary", "delete"] as const) {
    const { driver, values, orm: admin, ids } = indexedStore();
    await admin.create("Record", { name: "alice", score: 0, secret: "alice" });
    const orm = new TypeInfoORMService({
      ...config(driver),
      useDAC: true,
      indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(typeInfoMap, {
        backend: createIndexBackend({ values, valueWriter: values }),
      }),
      dacConfig: {
        itemResourcePathPrefix: ["ORM"],
        relationshipResourcePathPrefix: ["REL"],
        getOwnerPrefix: async () => [(await driver.readItem("one")).secret!],
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
          ],
        }),
      },
    });
    (orm as any).cleanupRelationships = async () => undefined;
    const reached = deferred();
    const release = deferred();
    // Pause after real DAC inspection, inside the driver's exclusion window.
    const update = driver.updateItem;
    const remove = driver.deleteItem;
    const pauseInspection = (options: any) => ({
      ...options,
      coordination: {
        ...options.coordination,
        inspect: async (current: Item | undefined) => {
          await options.coordination.inspect(current);
          reached.resolve();
          await release.promise;
        },
      },
    });
    driver.updateItem = (id, item, options) =>
      update(id, item, pauseInspection(options));
    driver.deleteItem = (id, options) => remove(id, pauseInspection(options));
    const context = { accessingRoleId: "alice" };
    const mutation =
      operation === "delete"
        ? orm.delete("Record", "one", context)
        : orm.update(
            "Record",
            { id: "one", name: "authorized" },
            operation === "guarded"
              ? { preconditions: { expected: { score: 0 } } }
              : undefined,
            context,
          );
    await reached.promise;
    let replacementDone = false;
    const replacement = admin
      .create("Record", { name: "bob", secret: "bob", score: 1 })
      .then(() => {
        replacementDone = true;
      });
    await Promise.resolve();
    assert.equal(replacementDone, false);
    release.resolve();
    await Promise.all([mutation, replacement]);
    driver.updateItem = update;
    driver.deleteItem = remove;
    assert.equal((await driver.readItem("one")).secret, "bob");
    assert.deepEqual(await ids("bob"), ["one"]);
    assert.deepEqual(await ids("alice"), []);
    assert.deepEqual(await ids("authorized"), []);
    assert.equal(
      await errorOf(() =>
        orm.update(
          "Record",
          { id: "one", name: "loser" },
          { preconditions: { expected: { score: 1 } } },
          context,
        ),
      ),
      "INVALID_OPERATION",
    );
    assert.equal(
      await errorOf(() => orm.delete("Record", "one", context)),
      "INVALID_OPERATION",
    );
    assert.equal((await driver.readItem("one")).name, "bob");
    assert.deepEqual(await ids("bob"), ["one"]);
    assert.deepEqual(await ids("loser"), []);

    // Reverse the order: outer payload authorization sees Alice, but a queued
    // replacement commits first. Commit-time inspection must reject the caller.
    await admin.create("Record", { name: "alice", secret: "alice", score: 0 });
    const held = deferred();
    const unlock = deferred();
    const dispatched = deferred();
    const inspection = driver.readItem("one", undefined, {
      coordination: {
        inspect: async () => {
          held.resolve();
          await unlock.promise;
        },
      },
    });
    await held.promise;
    const replaceFirst = admin.create("Record", {
      name: "bob",
      secret: "bob",
      score: 1,
    });
    driver.updateItem = (id, item, options) => {
      dispatched.resolve();
      return update(id, item, options);
    };
    driver.deleteItem = (id, options) => {
      dispatched.resolve();
      return remove(id, options);
    };
    const deniedMutation = errorOf(() =>
      operation === "delete"
        ? orm.delete("Record", "one", context)
        : orm.update(
            "Record",
            { id: "one", name: "loser" },
            operation === "guarded"
              ? { preconditions: { expected: { score: 1 } } }
              : undefined,
            context,
          ),
    );
    await dispatched.promise;
    unlock.resolve();
    await inspection;
    await replaceFirst;
    assert.equal(await deniedMutation, "INVALID_OPERATION");
    driver.updateItem = update;
    driver.deleteItem = remove;
    assert.equal((await driver.readItem("one")).secret, "bob");
    assert.deepEqual(await ids("bob"), ["one"]);
    assert.deepEqual(await ids("loser"), []);
  }
  return { verified: true };
};

/** Cleanup excludes recreation through both structured and text cleanup, even on failure. */
export const runCoordinatedMaintenance = async () => {
  const { FullTextMemoryBackend } =
    await import("../drivers/InMemoryDataItemDBDriver/Indexing/FullTextMemoryBackend");
  const { searchLossy } = await import("../../Indexing");
  for (const cleanupFailure of [undefined, "CLEANUP_UNAVAILABLE", "ITEM_NOT_FOUND"]) {
    const driver = makeDriver();
    const values = new StructuredInMemoryBackend();
    const text = new FullTextMemoryBackend();
    const types: TypeInfoMap = {
      Record: {
        ...typeInfoMap.Record,
        fields: {
          ...typeInfoMap.Record.fields,
          name: {
            ...field("string"),
            tags: { indexed: { exact: true, text: true } },
          },
        },
      },
    };
    const orm = new TypeInfoORMService({
      ...config(driver),
      typeInfoMap: types,
      indexing: getTypeInfoORMIndexingConfigFromTypeInfoMap(types, {
        backend: createIndexBackend({ values, valueWriter: values, text }),
      }),
    });
    const indexField = qualifyIndexField("Record", "name");
    const ids = async (name: string) =>
      (await values.terms.query(indexField, "eq", name)).candidateIds;
    const textIds = async (query: string) =>
      (await searchLossy({ backend: text, indexField, query, limit: 20 }))
        .docIds;
    await orm.create("Record", { name: "orphan", score: 0 });
    const version = (await values.documents!.list!({ limit: 10 })).documents[0]
      .version;
    await driver.deleteItem("one"); // Deliberately leave an orphan, as an out-of-band writer would.
    const reached = deferred();
    const release = deferred();
    const remove = text.removeDocumentIndex!.bind(text);
    text.removeDocumentIndex = async (...args) => {
      reached.resolve();
      await release.promise;
      if (cleanupFailure) throw new Error(cleanupFailure);
      return remove(...args);
    };
    const cleanup = orm.cleanupOrphanedIndexState("Record", "one", {
      structuredVersion: version,
    });
    // Attach rejection handling before intentionally releasing the failed phase.
    const outcome = cleanup.then(
      (value) => value.status,
      (error) => error.message,
    );
    await reached.promise;
    let recreated = false;
    const recreation = orm
      .create("Record", { name: "recreated", score: 1 })
      .then(() => {
        recreated = true;
      });
    await Promise.resolve();
    assert.equal(recreated, false);
    assert.equal(await errorOf(() => driver.readItem("one")), "ITEM_NOT_FOUND");
    release.resolve();
    assert.equal(
      await outcome,
      cleanupFailure ?? "cleaned",
    );
    await recreation;
    assert.equal((await driver.readItem("one")).name, "recreated");
    assert.deepEqual(await ids("recreated"), ["one"]);
    assert.deepEqual(await ids("orphan"), []);
    assert.deepEqual(await textIds("recreated"), ["one"]);
    assert.deepEqual(await textIds("orphan"), []);
    // Reindex uses a coordinated canonical inspection, never an ordinary snapshot.
    const read = driver.readItem;
    driver.readItem = (id, selected, options) => {
      if (!options?.coordination) throw new Error("ORDINARY_READ_FORBIDDEN");
      return read(id, selected, options);
    };
    await orm.reindexStoredItem("Record", "one");
    const write = values.write.bind(values);
    values.write = async () => {
      throw new Error("REINDEX_UNAVAILABLE");
    };
    assert.equal(
      await errorOf(() => orm.reindexStoredItem("Record", "one")),
      "REINDEX_UNAVAILABLE",
    );
    values.write = write;
    driver.readItem = read;
    assert.equal((await driver.readItem("one")).name, "recreated");
    assert.deepEqual(await ids("recreated"), ["one"]);
    assert.deepEqual(await textIds("recreated"), ["one"]);
    if (!cleanupFailure) {
      // A failed structured write must not release the next canonical writer
      // while its sibling full-text mutation is still in flight.
      const textReached = deferred();
      const textRelease = deferred();
      const writeText = text.writeDocument.bind(text);
      let pauseText = true;
      text.writeDocument = async (...args) => {
        if (pauseText) {
          pauseText = false;
          textReached.resolve();
          await textRelease.promise;
        }
        return writeText(...args);
      };
      let failStructured = true;
      values.write = (...args) => {
        if (failStructured) {
          failStructured = false;
          throw new Error("STRUCTURED_UNAVAILABLE");
        }
        return write(...args);
      };
      let failureReported = false;
      const first = errorOf(() =>
        orm.update("Record", { id: "one", name: "delayed" }),
      ).then((message) => {
        failureReported = true;
        return message;
      });
      await textReached.promise;
      const second = orm.update("Record", { id: "one", name: "latest" });
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.equal(failureReported, false);
      assert.equal((await driver.readItem("one")).name, "delayed");
      textRelease.resolve();
      assert.equal(await first, "CANONICAL_WRITE_COMMITTED");
      await second;
      assert.equal((await driver.readItem("one")).name, "latest");
      assert.deepEqual(await ids("latest"), ["one"]);
      assert.deepEqual(await ids("delayed"), []);
      assert.deepEqual(await textIds("latest"), ["one"]);
      assert.deepEqual(await textIds("delayed"), []);
    }
  }
  return { verified: true };
};
