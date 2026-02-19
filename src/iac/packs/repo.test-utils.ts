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
  const interfaceMeta = Metadata["AWS::CloudFormation::Interface"] || {};
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

export const runRepoPackParameterKeysScenario = async () =>
  (await runRepoPackScenario()).parameterKeys;

export const runRepoPackGroupLabelScenario = async () =>
  (await runRepoPackScenario()).groupLabel;

export const runRepoPackGroupParametersScenario = async () =>
  (await runRepoPackScenario()).groupParameters;

export const runRepoPackOwnerParamLabelScenario = async () =>
  (await runRepoPackScenario()).ownerParamLabel;

export const runRepoPackOwnerParamTypeScenario = async () =>
  (await runRepoPackScenario()).ownerParamType;

export const runRepoPackNameParamLabelScenario = async () =>
  (await runRepoPackScenario()).nameParamLabel;

export const runRepoPackBranchParamLabelScenario = async () =>
  (await runRepoPackScenario()).branchParamLabel;

export const runRepoPackTokenParamNoEchoScenario = async () =>
  (await runRepoPackScenario()).tokenParamNoEcho;
