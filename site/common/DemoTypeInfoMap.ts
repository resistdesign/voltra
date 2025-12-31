import { TypeInfoMap } from "../../src/common/TypeParsing/TypeInfo";
import JSONInfo from "./DemoTypeInfoMap.json";

// IMPORTANT: The JSONInfo gets generated at build time.
export const DemoTypeInfoMap: TypeInfoMap = JSONInfo;
