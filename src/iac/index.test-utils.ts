import * as IaC from "./index";
import { addBuildPipeline } from "./packs";
import { SimpleCFT } from "./SimpleCFT";

export const runIaCIndexScenario = () => {
  return {
    hasPacks: typeof IaC.Packs === "object",
    hasUtils: typeof IaC.Utils === "object",
    hasSimpleCFT: typeof IaC.SimpleCFT === "function",
    simpleCFTInstance: new IaC.SimpleCFT() instanceof SimpleCFT,
    packFunctionMatches: IaC.Packs.addBuildPipeline === addBuildPipeline,
  };
};
