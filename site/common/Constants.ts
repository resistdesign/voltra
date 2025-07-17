import { getTypeInfoMapFromTypeScript } from "../../src/common/TypeParsing";
import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";
// @ts-ignore
import DEMO_TS from "raw:./Types";

export const DEMO_TYPE_INFO_MAP: TypeInfoMap =
  getTypeInfoMapFromTypeScript(DEMO_TS);

export const DEMO_ORM_ROUTE_PATH = "/db";
export const BASE_DOMAIN = "demo.voltra.app";
export const DOMAINS = {
  APP: `docs.${BASE_DOMAIN}`,
  APP_LOCAL: `docs-local.${BASE_DOMAIN}`,
  API: `api.${BASE_DOMAIN}`,
  API_FILES: `api-files.${BASE_DOMAIN}`,
};
