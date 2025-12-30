/**
 * @packageDocumentation
 *
 * Repository parameter pack for build pipelines (owner/name/branch/token).
 */
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";

export type AddRepoConfig = {
  /**
   * Parameter name for repository owner.
   */
  repoOwnerParameterName: string;
  /**
   * Parameter name for repository name.
   */
  repoNameParameterName: string;
  /**
   * Parameter name for repository branch.
   */
  repoBranchParameterName: string;
  /**
   * Parameter name for repository access token.
   */
  repoTokenParameterName: string;
};

/**
 * Add repository related parameters for reference in other resources like a build pipeline (CI/CD).
 *
 * @param config - Repository parameter configuration.
 * */
export const addRepo = createResourcePack(
  ({
    repoOwnerParameterName,
    repoNameParameterName,
    repoBranchParameterName,
    repoTokenParameterName,
  }: AddRepoConfig) =>
    new SimpleCFT().addParameterGroup({
      Label: "Repository",
      Parameters: {
        [repoOwnerParameterName]: {
          Label: "RepoOwner",
          Type: "String",
          Description: "The owner of the repository",
        },
        [repoNameParameterName]: {
          Label: "RepoName",
          Type: "String",
          Description: "The name of the repository",
        },
        [repoBranchParameterName]: {
          Label: "RepoBranch",
          Type: "String",
          Description: "The branch of the repository",
        },
        [repoTokenParameterName]: {
          Label: "RepoToken",
          Type: "String",
          Description: "The token of the repository",
          NoEcho: true,
        },
      },
    }).template,
);
