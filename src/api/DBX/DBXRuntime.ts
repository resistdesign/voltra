import { addRouteMapToRouteMap } from "../Router";
import { getTypeInfoORMRouteMap } from "../ORM/ORMRouteMap";
import { InMemoryDataItemDBDriver } from "../ORM/drivers/InMemoryDataItemDBDriver";
import { InMemoryItemRelationshipDBDriver } from "../ORM/drivers/InMemoryItemRelationshipDBDriver";
import { ItemRelationshipInfoIdentifyingKeys } from "../../common/ItemRelationshipInfoTypes";
import { FullTextMemoryBackend } from "../Indexing/fulltext/FullTextMemoryBackend";
import { StructuredInMemoryBackend } from "../Indexing/structured/StructuredInMemoryBackend";
import { RelationalInMemoryBackend } from "../Indexing/rel/RelationalInMemoryBackend";
import type { DBXRuntime, DBXRuntimeConfig } from "./DBXTypes";
import type {
  TypeInfo,
  TypeInfoDataItem,
  TypeInfoMap,
} from "../../common/TypeParsing/TypeInfo";
import type {
  DataItemDBDriver,
  DataItemDBDriverConfig,
  ItemRelationshipDBDriver,
} from "../ORM/drivers/common/Types";
import type { TypeInfoORMIndexingConfig } from "../ORM/TypeInfoORMService";
import { getTypeInfoORMIndexingConfigFromTypeInfoMap } from "../ORM/getTypeInfoORMIndexingConfigFromTypeInfoMap";
import { createIndexBackend } from "../Indexing/query";

const DEFAULT_BASE_PATH = "orm";
const DEFAULT_ALLOWED_ORIGINS = ["https://dbx.local"];

const getItemTypeNames = (typeInfoMap: TypeInfoMap): string[] =>
  Object.keys(typeInfoMap).filter(
    (typeName) => !!typeInfoMap[typeName]?.primaryField,
  );

const buildDriverConfig = (
  typeName: string,
  typeInfo: TypeInfo,
  overrides?: Partial<
    Omit<
      DataItemDBDriverConfig<TypeInfoDataItem, string>,
      "uniquelyIdentifyingFieldName"
    >
  >,
  idGenerator?: (targetItem: TypeInfoDataItem) => string,
): DataItemDBDriverConfig<TypeInfoDataItem, string> => {
  const primaryField = typeInfo.primaryField;
  if (!primaryField) {
    throw new Error(`Type "${typeName}" is missing a primaryField.`);
  }

  return {
    tableName: overrides?.tableName ?? typeName,
    uniquelyIdentifyingFieldName: primaryField,
    generateUniqueIdentifier:
      idGenerator ?? overrides?.generateUniqueIdentifier,
    dbSpecificConfig: overrides?.dbSpecificConfig,
  } as DataItemDBDriverConfig<TypeInfoDataItem, string>;
};

const mergeIndexingConfig = (
  base: TypeInfoORMIndexingConfig,
  override?: Partial<TypeInfoORMIndexingConfig>,
): TypeInfoORMIndexingConfig => {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    backend: override.backend ?? base.backend,
    fieldsByType: {
      ...base.fieldsByType,
      ...override.fieldsByType,
    },
    relations: override.relations
      ? { ...base.relations, ...override.relations }
      : base.relations,
  };
};

const buildMemoryIndexingConfig = (
  typeInfoMap: TypeInfoMap,
  override?: Partial<TypeInfoORMIndexingConfig>,
): TypeInfoORMIndexingConfig => {
  const valueBackend = new StructuredInMemoryBackend();

  const base: TypeInfoORMIndexingConfig = {
    backend: createIndexBackend({
      values: valueBackend,
      valueWriter: valueBackend,
      text: new FullTextMemoryBackend(),
    }),
    allowFullScanFallback: true,
    relations: {
      backend: new RelationalInMemoryBackend(),
      relationNameFor: (fromTypeName, fromTypeFieldName) =>
        `${fromTypeName}.${fromTypeFieldName}`,
    },
  };

  return getTypeInfoORMIndexingConfigFromTypeInfoMap(
    typeInfoMap,
    mergeIndexingConfig(base, override),
  );
};

/**
 * Build an in-memory runtime for DBX scenarios.
 */
export const createDbxRuntime = (config: DBXRuntimeConfig): DBXRuntime => {
  const {
    typeInfoMap,
    itemTypeNames = getItemTypeNames(typeInfoMap),
    driverConfigByType = {},
    idGeneratorsByType = {},
    drivers: driverOverrides = {},
    relationshipDriver: relationshipDriverOverride,
    indexing: indexingOverride,
    useInMemoryIndexing = true,
    basePath = DEFAULT_BASE_PATH,
    authConfig,
    allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
    dacConfig,
    getAccessingRoleId,
    errorShouldBeExposedToClient,
  } = config;

  const drivers: Record<string, DataItemDBDriver<any, any>> = {
    ...driverOverrides,
  };

  for (const typeName of itemTypeNames) {
    if (drivers[typeName]) {
      continue;
    }

    const typeInfo = typeInfoMap[typeName];
    if (!typeInfo) {
      throw new Error(`Type "${typeName}" was not found in typeInfoMap.`);
    }

    const driverConfig = buildDriverConfig(
      typeName,
      typeInfo,
      driverConfigByType[typeName],
      idGeneratorsByType[typeName],
    );

    drivers[typeName] = new InMemoryDataItemDBDriver(
      driverConfig as DataItemDBDriverConfig<any, any>,
    );
  }

  const getDriver = (typeName: string): DataItemDBDriver<any, any> => {
    const driver = drivers[typeName];

    if (!driver) {
      throw new Error(`No DBX driver registered for type "${typeName}".`);
    }

    return driver;
  };

  const indexing = useInMemoryIndexing
    ? buildMemoryIndexingConfig(typeInfoMap, indexingOverride)
    : (indexingOverride as TypeInfoORMIndexingConfig | undefined);

  let relationshipDriver: ItemRelationshipDBDriver | undefined =
    relationshipDriverOverride;

  if (!relationshipDriver && !indexing?.relations) {
    relationshipDriver = new InMemoryItemRelationshipDBDriver({
      tableName: "Relationships",
      uniquelyIdentifyingFieldName: ItemRelationshipInfoIdentifyingKeys.id,
    });
  }

  const ormRouteMap = getTypeInfoORMRouteMap(
    {
      typeInfoMap,
      getDriver,
      getRelationshipDriver: relationshipDriver
        ? () => relationshipDriver as ItemRelationshipDBDriver
        : undefined,
      indexing,
    },
    dacConfig,
    getAccessingRoleId,
    authConfig,
  );

  const routeMap = addRouteMapToRouteMap({}, ormRouteMap, basePath);

  return {
    typeInfoMap,
    basePath,
    routeMap,
    allowedOrigins,
    getDriver,
    drivers,
    relationshipDriver,
    indexing,
    authConfig,
    dacConfig,
    getAccessingRoleId,
    errorShouldBeExposedToClient,
  };
};
