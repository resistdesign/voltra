import { getTypeInfoMapFromTypeScript } from "../../src/common/TypeParsing";
import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";
import FS from "fs";
import Path from "path";
// @ts-ignore
import DEMO_TS_PATH from "raw:./Types";

const DEMO_TS = FS.readFileSync(Path.resolve(DEMO_TS_PATH), "utf8");

export const DEMO_TYPE_INFO_MAP: TypeInfoMap =
  getTypeInfoMapFromTypeScript(DEMO_TS);

console.log("TYPE_INFO:", DEMO_TS, JSON.stringify(DEMO_TYPE_INFO_MAP, null, 2));
