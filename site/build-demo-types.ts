import { getTypeInfoMapFromTypeScript } from "../src/common/TypeParsing";
import { TypeInfoMap } from "../src/common/TypeParsing/TypeInfo";
import Path from "path";
import FS from "fs";
import { fileURLToPath } from "url";

const DEMO_TYPES_INPUT_PATH = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "common",
  "Types.ts",
);
const DEMO_TYPE_INFO_MAP_OUTPUT_PATH = Path.join(
  Path.dirname(fileURLToPath(import.meta.url)),
  "common",
  "DemoTypeInfoMap.json",
);
const DEMO_TS = FS.readFileSync(DEMO_TYPES_INPUT_PATH, "utf8");
const DEMO_TYPE_INFO_MAP: TypeInfoMap = getTypeInfoMapFromTypeScript(DEMO_TS);
const DEMO_TYPE_INFO_MAP_JSON = JSON.stringify(DEMO_TYPE_INFO_MAP, null, 2);

FS.writeFileSync(
  DEMO_TYPE_INFO_MAP_OUTPUT_PATH,
  DEMO_TYPE_INFO_MAP_JSON,
  "utf8",
);
