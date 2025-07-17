import { getTypeInfoMapFromTypeScript } from "../../src/common/TypeParsing";
import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";
import FS from "fs";
import Path from "path";

export const CLIENT_SIDE_DEMO_TYPE_INFO_MAP: TypeInfoMap =
  getTypeInfoMapFromTypeScript(
    FS.readFileSync(Path.join(__dirname, "Types.ts"), "utf-8"),
  );
