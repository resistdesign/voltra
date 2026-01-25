import type {
  TypeInfoDataItem,
  TypeInfoField,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";

/**
 * Dataset size presets for DBX scenarios.
 */
export const DBX_DATASET_SIZES = {
  SMALL: 50,
  MED: 200,
  LARGE: 1000,
} as const;

/**
 * Relationship edge shape used by DBX seeds.
 */
export type DBXSeedRelationship = {
  /**
   * Type name of the relationship origin.
   */
  fromTypeName: string;
  /**
   * Field name on the origin type that defines the relationship.
   */
  fromTypeFieldName: string;
  /**
   * Primary field value for the origin item.
   */
  fromTypePrimaryFieldValue: string;
  /**
   * Primary field value for the target item.
   */
  toTypePrimaryFieldValue: string;
};

/**
 * Configuration for generating a DBX dataset.
 */
export type DBXSeedConfig = {
  /**
   * Seed used for deterministic generation.
   */
  seed: number | string;
  /**
   * Type info map used to shape items.
   */
  typeInfoMap: TypeInfoMap;
  /**
   * Optional list of type names to seed.
   */
  itemTypeNames?: string[];
  /**
   * Default item count per type when sizeByType is not provided.
   */
  size?: number;
  /**
   * Optional per-type overrides for item counts.
   */
  sizeByType?: Record<string, number>;
  /**
   * Optional base date for date-like string fields.
   */
  baseDate?: string;
  /**
   * Whether to include optional fields (default true).
   */
  includeOptionalFields?: boolean;
  /**
   * Whether to include array fields (default true).
   */
  includeArrayFields?: boolean;
  /**
   * Max array length when generating array fields.
   */
  maxArrayLength?: number;
  /**
   * Custom token pool for text generation.
   */
  textTokenPool?: string[];
  /**
   * Whether to include relationship edges (default true).
   */
  includeRelationships?: boolean;
  /**
   * Ratio of relationship edges that should point at missing targets.
   */
  relationshipDanglingRate?: number;
  /**
   * Number of relationships to generate per item when possible.
   */
  relationshipsPerItem?: number;
};

/**
 * Seeded dataset payload returned by {@link makeDbxDataset}.
 */
export type DBXSeedDataset = {
  /**
   * Seed used for deterministic generation.
   */
  seed: number | string;
  /**
   * Items keyed by type name.
   */
  itemsByType: Record<string, TypeInfoDataItem[]>;
  /**
   * Generated ids per type name.
   */
  idsByType: Record<string, string[]>;
  /**
   * Relationship edges seeded for scenarios.
   */
  relationships: DBXSeedRelationship[];
  /**
   * Token pool used for text values.
   */
  tokenPool: string[];
};

type DBXRng = {
  next: () => number;
  nextFloat: () => number;
  nextInt: (max: number) => number;
  pick: <T>(values: T[]) => T;
};

const DEFAULT_TOKEN_POOL = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "omega",
  "ALPHA",
  "Beta",
  "alpha-beta",
  "alpha_beta",
  "alpha.beta",
  "foo",
  "bar",
  "baz",
  "qux",
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "O'Reilly",
  "ACME",
];

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
};

const createDbxRng = (seed: number | string): DBXRng => {
  let state =
    typeof seed === "number" ? seed >>> 0 : hashSeed(String(seed));
  if (!state) {
    state = 1;
  }

  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };

  const nextFloat = () => next() / 0xffffffff;

  return {
    next,
    nextFloat,
    nextInt: (max) => (max <= 0 ? 0 : next() % max),
    pick: (values) => values[next() % values.length],
  };
};

const getItemTypeNames = (typeInfoMap: TypeInfoMap): string[] =>
  Object.keys(typeInfoMap).filter(
    (typeName) => !!typeInfoMap[typeName]?.primaryField,
  );

const buildSeedId = (typeName: string, index: number): string =>
  `${typeName.toLowerCase()}-${String(index).padStart(4, "0")}`;

const buildTextValue = (
  fieldName: string,
  tokenPool: string[],
  rng: DBXRng,
): string => {
  const isLongText = /body|description|content|text/i.test(fieldName);
  const targetLength = isLongText ? 18 : 6;
  const tokens: string[] = [];

  for (let i = 0; i < targetLength; i += 1) {
    tokens.push(tokenPool[rng.nextInt(tokenPool.length)]);
  }

  return tokens.join(" ");
};

const buildNumberValue = (
  field: TypeInfoField,
  rng: DBXRng,
): number => {
  const constraints = field.tags?.constraints;
  const min = constraints?.min ?? 0;
  const max = constraints?.max ?? 1000;
  const step = constraints?.step ?? 1;
  const range = Math.max(max - min, 0);
  const raw = min + rng.nextFloat() * range;
  if (step <= 0) {
    return Math.round(raw);
  }

  return Math.round(raw / step) * step;
};

const buildBooleanValue = (rng: DBXRng): boolean => rng.nextFloat() > 0.5;

const buildDateValue = (baseDate: string, index: number): string => {
  const base = new Date(baseDate);
  if (Number.isNaN(base.getTime())) {
    return new Date().toISOString();
  }

  const next = new Date(base);
  next.setUTCDate(base.getUTCDate() + index);
  return next.toISOString();
};

const shouldIncludeField = (
  field: TypeInfoField,
  includeOptionalFields: boolean,
  rng: DBXRng,
): boolean => {
  if (!field.optional) {
    return true;
  }

  if (!includeOptionalFields) {
    return false;
  }

  return rng.nextFloat() > 0.2;
};

const resolveFieldValue = (
  fieldName: string,
  field: TypeInfoField,
  index: number,
  typeInfoMap: TypeInfoMap,
  idsByType: Record<string, string[]>,
  rng: DBXRng,
  tokenPool: string[],
  baseDate: string,
): string | number | boolean => {
  if (field.typeReference) {
    const ids = idsByType[field.typeReference];
    if (ids?.length) {
      return ids[rng.nextInt(ids.length)];
    }
  }

  if (field.possibleValues?.length) {
    return rng.pick(field.possibleValues);
  }

  if (field.type === "boolean") {
    return buildBooleanValue(rng);
  }

  if (field.type === "number") {
    return buildNumberValue(field, rng);
  }

  if (field.tags?.format && field.tags.format.toLowerCase().includes("date")) {
    return buildDateValue(baseDate, index);
  }

  return buildTextValue(fieldName, tokenPool, rng);
};

const buildArrayValue = (
  valueBuilder: () => string | number | boolean,
  maxArrayLength: number,
  rng: DBXRng,
): Array<string | number | boolean> => {
  const length = Math.max(1, rng.nextInt(maxArrayLength + 1));
  const values: Array<string | number | boolean> = [];
  for (let i = 0; i < length; i += 1) {
    values.push(valueBuilder());
  }
  return values;
};

const buildDbxRelationships = (
  typeInfoMap: TypeInfoMap,
  itemsByType: Record<string, TypeInfoDataItem[]>,
  idsByType: Record<string, string[]>,
  rng: DBXRng,
  options: {
    relationshipDanglingRate: number;
    relationshipsPerItem: number;
  },
): DBXSeedRelationship[] => {
  const relationships: DBXSeedRelationship[] = [];

  for (const typeName of Object.keys(itemsByType)) {
    const typeInfo = typeInfoMap[typeName];
    const primaryField = typeInfo?.primaryField;
    const fields = typeInfo?.fields ?? {};
    if (!primaryField) {
      continue;
    }

    for (const fieldName of Object.keys(fields)) {
      const field = fields[fieldName];
      if (!field?.typeReference) {
        continue;
      }

      const targetIds = idsByType[field.typeReference] ?? [];
      const items = itemsByType[typeName] ?? [];

      for (const item of items) {
        const originId = item[primaryField];
        if (typeof originId !== "string") {
          continue;
        }

        const linkCount = Math.max(1, options.relationshipsPerItem);

        for (let i = 0; i < linkCount; i += 1) {
          const isDangling = rng.nextFloat() < options.relationshipDanglingRate;
          const targetId = isDangling
            ? `missing-${field.typeReference}-${rng.nextInt(9999)}`
            : targetIds[rng.nextInt(targetIds.length)];

          if (!targetId) {
            continue;
          }

          relationships.push({
            fromTypeName: typeName,
            fromTypeFieldName: fieldName,
            fromTypePrimaryFieldValue: originId,
            toTypePrimaryFieldValue: targetId,
          });
        }
      }
    }
  }

  return relationships;
};

/**
 * Generate a deterministic dataset for DBX scenarios.
 */
export const makeDbxDataset = (config: DBXSeedConfig): DBXSeedDataset => {
  const {
    seed,
    typeInfoMap,
    itemTypeNames = getItemTypeNames(typeInfoMap),
    size = DBX_DATASET_SIZES.SMALL,
    sizeByType = {},
    baseDate = "2020-01-01T00:00:00.000Z",
    includeOptionalFields = true,
    includeArrayFields = true,
    maxArrayLength = 3,
    textTokenPool = DEFAULT_TOKEN_POOL,
    includeRelationships = true,
    relationshipDanglingRate = 0.15,
    relationshipsPerItem = 1,
  } = config;

  const rng = createDbxRng(seed);
  const tokenPool = textTokenPool.length ? textTokenPool : DEFAULT_TOKEN_POOL;
  const itemsByType: Record<string, TypeInfoDataItem[]> = {};
  const idsByType: Record<string, string[]> = {};

  for (const typeName of itemTypeNames) {
    const typeInfo = typeInfoMap[typeName];
    const primaryField = typeInfo?.primaryField;
    if (!primaryField) {
      continue;
    }

    const count = sizeByType[typeName] ?? size;
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      ids.push(buildSeedId(typeName, i + 1));
    }
    idsByType[typeName] = ids;
  }

  for (const typeName of itemTypeNames) {
    const typeInfo = typeInfoMap[typeName];
    const primaryField = typeInfo?.primaryField;
    const fields = typeInfo?.fields ?? {};
    if (!primaryField) {
      continue;
    }

    const ids = idsByType[typeName] ?? [];
    const items: TypeInfoDataItem[] = [];

    for (let index = 0; index < ids.length; index += 1) {
      const item: TypeInfoDataItem = {
        [primaryField]: ids[index],
      };

      for (const fieldName of Object.keys(fields)) {
        const field = fields[fieldName];
        if (!field || fieldName === primaryField) {
          continue;
        }

        if (!shouldIncludeField(field, includeOptionalFields, rng)) {
          continue;
        }

        if (field.array && !includeArrayFields) {
          continue;
        }

        const valueBuilder = () =>
          resolveFieldValue(
            fieldName,
            field,
            index,
            typeInfoMap,
            idsByType,
            rng,
            tokenPool,
            baseDate,
          );

        item[fieldName] = field.array
          ? buildArrayValue(valueBuilder, maxArrayLength, rng)
          : valueBuilder();
      }

      items.push(item);
    }

    itemsByType[typeName] = items;
  }

  const relationships = includeRelationships
    ? buildDbxRelationships(typeInfoMap, itemsByType, idsByType, rng, {
        relationshipDanglingRate,
        relationshipsPerItem,
      })
    : [];

  return {
    seed,
    itemsByType,
    idsByType,
    relationships,
    tokenPool,
  };
};

/**
 * Build relationship seeds from existing items.
 */
export const makeDbxRelationshipSeeds = (
  typeInfoMap: TypeInfoMap,
  itemsByType: Record<string, TypeInfoDataItem[]>,
  idsByType: Record<string, string[]>,
  options: {
    seed: number | string;
    relationshipDanglingRate?: number;
    relationshipsPerItem?: number;
  },
): DBXSeedRelationship[] => {
  const rng = createDbxRng(options.seed);
  return buildDbxRelationships(typeInfoMap, itemsByType, idsByType, rng, {
    relationshipDanglingRate: options.relationshipDanglingRate ?? 0.15,
    relationshipsPerItem: options.relationshipsPerItem ?? 1,
  });
};
