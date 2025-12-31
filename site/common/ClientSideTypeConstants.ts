import { getTypeInfoMapFromTypeScript } from "../../src/common/TypeParsing";
import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";
import FS from "fs";
import Path from "path";
import { fileURLToPath } from "url";

const moduleDirname = typeof __dirname === "string"
  ? __dirname
  : Path.dirname(fileURLToPath(import.meta.url));

export const CLIENT_SIDE_DEMO_TYPE_INFO_MAP: TypeInfoMap =
  getTypeInfoMapFromTypeScript(
    FS.readFileSync(Path.join(moduleDirname, "Types.ts"), "utf-8"),
  );
