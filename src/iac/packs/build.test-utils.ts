import { SimpleCFT } from "../SimpleCFT";
import {
  addBuildPipeline,
  DEFAULT_BUILD_PIPELINE_REPO_PROVIDER,
} from "./build";

export const runBuildPackScenario = () => {
  const template = new SimpleCFT()
    .applyPack(addBuildPipeline, {
      id: "Build",
      buildSpec: "buildspec.yml",
      repoConfig: {
        owner: "voltra",
        repo: "platform",
        branch: "main",
        oauthToken: "token",
      },
    })
    .toJSON();

  const resources = template.Resources || {};
  const pipeline = resources.BuildPipeline as any;
  const codeBuild = resources.BuildCodeBuildAndDeploy as any;

  const stages = pipeline?.Properties?.Stages || [];
  const sourceStage = stages[0];
  const buildStage = stages[1];

  return {
    resourceKeys: Object.keys(resources).sort(),
    provider: sourceStage?.Actions?.[0]?.ActionTypeId?.Provider,
    defaultProvider: DEFAULT_BUILD_PIPELINE_REPO_PROVIDER,
    environmentType: codeBuild?.Properties?.Environment?.Type,
    environmentComputeType: codeBuild?.Properties?.Environment?.ComputeType,
    environmentImage: codeBuild?.Properties?.Environment?.Image,
    sourceOwner: sourceStage?.Actions?.[0]?.Configuration?.Owner,
    buildProjectRef: buildStage?.Actions?.[0]?.Configuration?.ProjectName?.Ref,
  };
};

export const runBuildPackResourceKeysScenario = async () =>
  (await runBuildPackScenario()).resourceKeys;

export const runBuildPackProviderScenario = async () =>
  (await runBuildPackScenario()).provider;

export const runBuildPackDefaultProviderScenario = async () =>
  (await runBuildPackScenario()).defaultProvider;

export const runBuildPackEnvironmentTypeScenario = async () =>
  (await runBuildPackScenario()).environmentType;

export const runBuildPackEnvironmentComputeTypeScenario = async () =>
  (await runBuildPackScenario()).environmentComputeType;

export const runBuildPackEnvironmentImageScenario = async () =>
  (await runBuildPackScenario()).environmentImage;

export const runBuildPackSourceOwnerScenario = async () =>
  (await runBuildPackScenario()).sourceOwner;

export const runBuildPackBuildProjectRefScenario = async () =>
  (await runBuildPackScenario()).buildProjectRef;
