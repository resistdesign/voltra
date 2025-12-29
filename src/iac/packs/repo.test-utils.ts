import { SimpleCFT } from "../SimpleCFT";
import { addRepo } from "./repo";

export const runRepoPackScenario = () => {
  const template = new SimpleCFT()
    .applyPack(addRepo, {
      repoOwnerParameterName: "RepoOwner",
      repoNameParameterName: "RepoName",
      repoBranchParameterName: "RepoBranch",
      repoTokenParameterName: "RepoToken",
    })
    .toJSON();

  const { Parameters = {}, Metadata = {} } = template;
  const interfaceMeta =
    Metadata["AWS::CloudFormation::Interface"] || {};
  const { ParameterGroups = [], ParameterLabels = {} } = interfaceMeta;
  const repoGroup = ParameterGroups.find(
    (group: any) => group?.Label?.default === "Repository",
  );

  return {
    parameterKeys: Object.keys(Parameters).sort(),
    groupLabel: repoGroup?.Label?.default,
    groupParameters: repoGroup?.Parameters,
    ownerParamLabel: ParameterLabels.RepoOwner?.default,
    ownerParamType: Parameters.RepoOwner?.Type,
    nameParamLabel: ParameterLabels.RepoName?.default,
    branchParamLabel: ParameterLabels.RepoBranch?.default,
    tokenParamNoEcho: Parameters.RepoToken?.NoEcho,
  };
};
