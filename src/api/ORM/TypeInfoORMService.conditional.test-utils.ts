import { TypeInfoORMService } from "./TypeInfoORMService";
import { InMemoryDataItemDBDriver } from "./drivers/InMemoryDataItemDBDriver";
import { StructuredInMemoryBackend } from "./drivers/InMemoryDataItemDBDriver/Indexing/StructuredInMemoryBackend";
import { createIndexBackend } from "../Indexing/query";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "./getTypeInfoORMIndexingConfigFromTypeInfoMap";
import {
  TypeInfoORMServiceError,
  TypeInfoORMUpdateOperators,
  OperationGroup,
} from "../../common/TypeInfoORM";
import { TypeInfoMap, TypeOperation } from "../../common/TypeParsing/TypeInfo";
import {
  ComparisonOperators,
  LogicalOperators,
} from "../../common/SearchTypes";
import {
  DACConstraintType,
  WILDCARD_SIGNIFIER_PROTOTYPE,
} from "../DataAccessControl";
import type { DataItemDBDriver } from "./drivers/common/Types";

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
  const verification = await orm.verifyStoredItemForIndexMaintenance(
    "Record",
    "one",
  );
  await orm.reindexStoredItem("Record", "one", { previousItem });
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
  driver.readItem = async (...args) => {
    ordinaryReads++;
    return read(...args);
  };
  // Use a receiver-dependent non-arrow method to verify wrapper binding.
  driver.readItemStronglyConsistent = async function (id, selected) {
    selections.push(selected ?? "ALL");
    if (this !== driver) throw new Error("LOST_RECEIVER");
    return read(id, selected);
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
  const legacy: DataItemDBDriver<Item, "id"> = {
    createItem: driver.createItem,
    readItem: driver.readItem,
    updateItem: driver.updateItem,
    deleteItem: driver.deleteItem,
    listItems: driver.listItems,
  };
  const unsupported = new TypeInfoORMService(config(legacy));
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
  // Defaults continue to permit overwrite and upsert on a legacy driver.
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
