import Path from "path";
import FS from "fs";
import { getTypeInfoMapFromTypeScript } from "../src/common/TypeParsing/TypeParsing";

const CURRENT_DIR = Path.dirname(new URL(import.meta.url).pathname);
const API_ORM_DRIVERS_DIR = Path.join(
  CURRENT_DIR,
  "..",
  "src",
  "api",
  "ORM",
  "drivers",
);
const DRIVER_FOLDER_NAMES = {
  DDB: "DynamoDBDataItemDBDriver",
  MemDataItem: "InMemoryDataItemDBDriver",
  MemFileItem: "InMemoryFileItemDBDriver",
  S3: "S3FileItemDBDriver",
};
const CONFIG_TYPES_INPUT_FILE_NAME = "ConfigTypes.ts";
const CONFIG_TYPES_OUTPUT_FILE_NAME = "ConfigTypeInfoMap.json";

for (const driverFolderName of Object.values(DRIVER_FOLDER_NAMES)) {
  const inputFilePath = Path.join(
    API_ORM_DRIVERS_DIR,
    driverFolderName,
    CONFIG_TYPES_INPUT_FILE_NAME,
  );
  const outputFilePath = Path.join(
    API_ORM_DRIVERS_DIR,
    driverFolderName,
    CONFIG_TYPES_OUTPUT_FILE_NAME,
  );
  const fileContent = FS.readFileSync(inputFilePath, "utf-8");
  const typeInfoMap = getTypeInfoMapFromTypeScript(fileContent);
  const typeInfoMapJson = JSON.stringify(typeInfoMap, null, 2);

  FS.writeFileSync(outputFilePath, typeInfoMapJson);
}
