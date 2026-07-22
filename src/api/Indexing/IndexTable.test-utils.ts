import {
  INDEX_ITEM_KINDS,
  assertIndexTableKey,
  buildIndexKey,
  decodeIndexIdentity,
  encodeIndexIdentity,
  encodeSortableIndexValue,
} from "./IndexTable";
import {
  buildStructuredRangeItem,
  buildStructuredTermItem,
} from "./structured/StructuredDdb";

export const runIndexTableIdentityRoundTripScenario = () => {
  const values = ["plain", "a#b/c?d", "100%", "éclair", "emoji-💜"];
  return values.map((value) => decodeIndexIdentity(encodeIndexIdentity(value)));
};

export const runIndexTableIdentityCollisionScenario = () => {
  const keys = [
    buildIndexKey(INDEX_ITEM_KINDS.structuredTerm, "Thing#field", "value"),
    buildIndexKey(INDEX_ITEM_KINDS.structuredTerm, "Thing", "field#value"),
    buildIndexKey(INDEX_ITEM_KINDS.structuredRange, "Thing#field", "value"),
  ];
  return { keys, uniqueCount: new Set(keys).size };
};

export const runIndexTableLogicalIsolationScenario = () => {
  const identity = ["Article.title", "hello"] as const;
  const keys = Object.values(INDEX_ITEM_KINDS).map((kind) =>
    buildIndexKey(kind, ...identity),
  );
  return { count: keys.length, uniqueCount: new Set(keys).size };
};

export const runIndexTableSortableNumberScenario = () => {
  const values = [-230, -10, -1, -0, 0, 0.5, 2, 23, 34, 230];
  return values
    .map((value) => ({ value, key: encodeSortableIndexValue(value) }))
    .sort((left, right) =>
      left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
    )
    .map(({ value }) => value);
};

export const runIndexTableSortableStringScenario = () => {
  const values = ["z", "aa", "a#", "a", "é", "💜"];
  return values
    .map((value) => ({ value, key: encodeSortableIndexValue(value) }))
    .sort((left, right) =>
      left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
    )
    .map(({ value }) => value);
};

export const runIndexTableStructuredCollisionScenario = () => {
  const left = buildStructuredTermItem("Thing#field", "value", "eq", "a#b");
  const right = buildStructuredTermItem("Thing", "field#value", "eq", "a");
  const rangeLeft = buildStructuredRangeItem("Thing", "a#b", "c");
  const rangeRight = buildStructuredRangeItem("Thing", "a", "b#c");
  const nullTerm = buildStructuredTermItem("Thing", null, "eq", "d");
  const nullStringTerm = buildStructuredTermItem("Thing", "null", "eq", "d");
  return {
    termKeysDiffer: left.pk !== right.pk || left.sk !== right.sk,
    rangeKeysDiffer:
      rangeLeft.pk !== rangeRight.pk || rangeLeft.sk !== rangeRight.sk,
    nullKeysDiffer: nullTerm.pk !== nullStringTerm.pk,
  };
};

export const runIndexTableRejectsMalformedUnicodeScenario = () => {
  try {
    encodeIndexIdentity("\ud800");
    return false;
  } catch (_error) {
    return true;
  }
};

export const runIndexTableRejectsOversizedKeyScenario = () => {
  try {
    assertIndexTableKey({ pk: "p", sk: "x".repeat(1025) });
    return false;
  } catch (_error) {
    return true;
  }
};
