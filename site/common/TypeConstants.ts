import { getTypeInfoMapFromTypeScript } from "../../src/common/TypeParsing";
import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";
import DEMO_TS from "source:./Types";

export const DEMO_TYPE_INFO_MAP: TypeInfoMap =
  getTypeInfoMapFromTypeScript(DEMO_TS);

console.log("TYPE_INFO:", DEMO_TS, JSON.stringify(DEMO_TYPE_INFO_MAP, null, 2));
