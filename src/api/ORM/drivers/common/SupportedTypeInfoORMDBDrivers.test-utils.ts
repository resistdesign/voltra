import {
  DATA_ITEM_DB_DRIVER_ERRORS,
  type DataItemDBDriver,
} from "./Types";
import {
  SupportedTypeInfoORMDBDriverNames,
  SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS,
} from "./SupportedTypeInfoORMDBDrivers";

type TestItem = {
  id: string;
  name: string;
};

const hasDriverShape = (driver: DataItemDBDriver<TestItem, "id">) => {
  return {
    createItem: typeof driver.createItem === "function",
    readItem: typeof driver.readItem === "function",
    updateItem: typeof driver.updateItem === "function",
    deleteItem: typeof driver.deleteItem === "function",
    listItems: typeof driver.listItems === "function",
  };
};

export const runSupportedTypeInfoOrmDriversScenario = () => {
  const driverNames = Object.values(SupportedTypeInfoORMDBDriverNames);
  const supportedKeys = Object.keys(SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS).sort();

  const getEntry = (name: SupportedTypeInfoORMDBDriverNames) =>
    SUPPORTED_TYPE_INFO_ORM_DB_DRIVERS[name];

  const dynamoEntry = getEntry(SupportedTypeInfoORMDBDriverNames.DYNAMO_DB_DATA_ITEM);
  const inMemoryEntry = getEntry(SupportedTypeInfoORMDBDriverNames.IN_MEMORY_DATA_ITEM);
  const inMemoryFileEntry = getEntry(SupportedTypeInfoORMDBDriverNames.IN_MEMORY_FILE_ITEM);
  const s3Entry = getEntry(SupportedTypeInfoORMDBDriverNames.S3_FILE_ITEM);

  const dynamoDriver = dynamoEntry?.factory<TestItem, "id">({
    tableName: "TestItems",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: {},
  });
  const inMemoryDriver = inMemoryEntry?.factory<TestItem, "id">({
    tableName: "TestItems",
    uniquelyIdentifyingFieldName: "id",
  });
  const inMemoryFileDriver = inMemoryFileEntry?.factory({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
  });
  const s3FileDriver = s3Entry?.factory({
    tableName: "Files",
    uniquelyIdentifyingFieldName: "id",
    dbSpecificConfig: { bucketName: "test-bucket", s3Config: {} },
  });

  return {
    driverNames,
    supportedKeys,
    entryTypeNames: {
      dynamo: dynamoEntry?.getDBSpecificConfigTypeInfo().entryTypeName,
      inMemory: inMemoryEntry?.getDBSpecificConfigTypeInfo().entryTypeName,
      inMemoryFile: inMemoryFileEntry?.getDBSpecificConfigTypeInfo().entryTypeName,
      s3: s3Entry?.getDBSpecificConfigTypeInfo().entryTypeName,
    },
    dynamoDriverShape: dynamoDriver
      ? hasDriverShape(dynamoDriver as DataItemDBDriver<TestItem, "id">)
      : undefined,
    inMemoryDriverShape: inMemoryDriver
      ? hasDriverShape(inMemoryDriver as DataItemDBDriver<TestItem, "id">)
      : undefined,
    inMemoryFileDriverShape: inMemoryFileDriver
      ? hasDriverShape(inMemoryFileDriver as DataItemDBDriver<TestItem, "id">)
      : undefined,
    s3DriverShape: s3FileDriver
      ? hasDriverShape(s3FileDriver as DataItemDBDriver<TestItem, "id">)
      : undefined,
    dataItemErrors: DATA_ITEM_DB_DRIVER_ERRORS,
  };
};
