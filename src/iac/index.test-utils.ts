import * as IaC from "./index";
import { addParameter } from "./utils";
import { SimpleCFT } from "./SimpleCFT";

export const runIaCIndexScenario = () => {
  return {
    hasUtilFunction: typeof IaC.addParameter === "function",
    hasSimpleCFT: typeof IaC.SimpleCFT === "function",
    simpleCFTInstance: new IaC.SimpleCFT() instanceof SimpleCFT,
    utilFunctionMatches: IaC.addParameter === addParameter,
  };
};
