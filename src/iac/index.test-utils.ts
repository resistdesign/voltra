import * as IaC from "./index";
import { addBuildPipeline } from "./packs";
import { addParameter } from "./utils";
import { SimpleCFT } from "./SimpleCFT";

export const runIaCIndexScenario = () => {
  return {
    hasPackFunction: typeof IaC.addBuildPipeline === "function",
    hasUtilFunction: typeof IaC.addParameter === "function",
    hasSimpleCFT: typeof IaC.SimpleCFT === "function",
    simpleCFTInstance: new IaC.SimpleCFT() instanceof SimpleCFT,
    packFunctionMatches: IaC.addBuildPipeline === addBuildPipeline,
    utilFunctionMatches: IaC.addParameter === addParameter,
  };
};
