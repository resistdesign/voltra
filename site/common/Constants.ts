// @ts-ignore
import DEMO_TS from "bundle-text:./Types";
import { getTypeInfoMapFromTypeScript } from "../../src/common/TypeParsing";
import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";

export const DEMO_TYPE_INFO_MAP: TypeInfoMap = getTypeInfoMapFromTypeScript(
  DEMO_TS as string,
);

export const DEMO_ORM_ROUTE_PATH = "/db";
