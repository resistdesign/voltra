/**
 * @packageDocumentation
 *
 * CodePipeline/CodeBuild pack for a simple build-and-deploy pipeline.
 */
import { createResourcePack } from "../utils";
import { AWS } from "../types/IaCTypes";

/**
 * Default repository provider for CodePipeline source actions.
 */
export const DEFAULT_BUILD_PIPELINE_REPO_PROVIDER = "GitHub";

/**
 * Source repository configuration for the build pipeline.
 */
export type BuildPipelineRepoConfig = {
  /**
   * CodePipeline provider (e.g., GitHub).
   */
  provider?: any;
  /**
   * Repository owner/organization.
   */
  owner: any;
  /**
   * Repository name.
   */
  repo: any;
  /**
   * Repository branch name.
   */
  branch: any;
  /**
   * OAuth token for source access.
   */
  oauthToken: any;
};

/**
 * Helper for custom CodeBuild string literals.
 */
export type CustomCodeBuildString<T extends string> = T & { __custom?: never };

/**
 * Allowed CodeBuild environment types.
 */
export type CodeBuildEnvironmentType =
  | "ARM_CONTAINER"
  | "LINUX_CONTAINER"
  | "LINUX_GPU_CONTAINER"
  | "WINDOWS_SERVER_2019_CONTAINER"
  | "WINDOWS_SERVER_2022_CONTAINER"
  | "LINUX_EC2"
  | "ARM_EC2"
  | "WINDOWS_EC2"
  | "MAC_ARM"
  | CustomCodeBuildString<string>;

/**
 * Allowed CodeBuild compute types.
 */
export type CodeBuildComputeType =
  | "BUILD_GENERAL1_SMALL"
  | "BUILD_GENERAL1_MEDIUM"
  | "BUILD_GENERAL1_LARGE"
  | "BUILD_GENERAL1_2XLARGE"
  | "BUILD_GENERAL1_XLARGE"
  | CustomCodeBuildString<string>;

/**
 * Configuration for the build pipeline pack.
 */
export type AddBuildPipelineConfig = {
  /**
   * Base id for created resources.
   */
  id: string;
  /**
   * Build spec YAML or JSON.
   */
  buildSpec: any;
  /**
   * Optional resource dependencies.
   */
  dependsOn?: string | string[];
  /**
   * CodeBuild environment variables.
   */
  environmentVariables?: AWS.CodeBuild.Project.EnvironmentVariable[];
  /**
   * Build timeout in minutes.
   */
  timeoutInMinutes?: number;
  /**
   * CodeBuild environment type.
   */
  environmentType?: CodeBuildEnvironmentType;
  /**
   * CodeBuild compute type.
   */
  environmentComputeType?: CodeBuildComputeType;
  /**
   * CodeBuild image to run.
   */
  environmentImage?: string;
  /**
   * Repository configuration for source stage.
   */
  repoConfig: BuildPipelineRepoConfig;
};

/**
 * Add a build pipeline with full permissions.
 *
 * @param config - Build pipeline configuration.
 */
export const addBuildPipeline = createResourcePack(
  ({
    id,
    buildSpec,
    dependsOn,
    environmentVariables,
    timeoutInMinutes = 10,
    environmentType = "LINUX_CONTAINER",
    environmentComputeType = "BUILD_GENERAL1_SMALL",
    environmentImage = "aws/codebuild/nodejs:10.14.1",
    repoConfig: {
      provider = DEFAULT_BUILD_PIPELINE_REPO_PROVIDER,
      owner,
      repo,
      branch,
      oauthToken,
    },
  }: AddBuildPipelineConfig) => ({
    Resources: {
      [`${id}CodeBuildRole`]: {
        Type: "AWS::IAM::Role",
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  Service: ["codebuild.amazonaws.com"],
                },
                Action: ["sts:AssumeRole"],
              },
            ],
          },
          Path: "/",
          Policies: [
            {
              PolicyName: "codebuild-service",
              PolicyDocument: {
                Statement: [
                  {
                    Effect: "Allow",
                    Action: "*",
                    Resource: "*",
                  },
                ],
                Version: "2012-10-17",
              },
            },
          ],
        },
      },
      [`${id}CodePipelineRole`]: {
        Type: "AWS::IAM::Role",
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  Service: ["codepipeline.amazonaws.com"],
                },
                Action: ["sts:AssumeRole"],
              },
            ],
          },
          Path: "/",
          Policies: [
            {
              PolicyName: "codepipeline-service",
              PolicyDocument: {
                Statement: [
                  {
                    Action: ["codebuild:*"],
                    Resource: "*",
                    Effect: "Allow",
                  },
                  {
                    Action: [
                      "s3:GetObject",
                      "s3:GetObjectVersion",
                      "s3:GetBucketVersioning",
                    ],
                    Resource: "*",
                    Effect: "Allow",
                  },
                  {
                    Action: ["s3:PutObject"],
                    Resource: ["arn:aws:s3:::codepipeline*"],
                    Effect: "Allow",
                  },
                  {
                    Action: ["s3:*", "cloudformation:*", "iam:PassRole"],
                    Resource: "*",
                    Effect: "Allow",
                  },
                ],
                Version: "2012-10-17",
              },
            },
          ],
        },
      },
      [`${id}PipelineBucket`]: {
        Type: "AWS::S3::Bucket",
        DeletionPolicy: "Delete",
        Properties: {
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [
              {
                ServerSideEncryptionByDefault: {
                  SSEAlgorithm: "AES256",
                },
              },
            ],
          },
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
          },
        },
      },
      [`${id}CodeBuildAndDeploy`]: {
        Type: "AWS::CodeBuild::Project",
        DependsOn: dependsOn,
        Properties: {
          Name: {
            "Fn::Sub": `\${AWS::StackName}-${id}CodeBuildAndDeploy`,
          },
          Description: "Deploy site to S3",
          ServiceRole: {
            "Fn::GetAtt": [`${id}CodeBuildRole`, "Arn"],
          },
          Artifacts: {
            Type: "CODEPIPELINE",
          },
          Environment: {
            Type: environmentType,
            ComputeType: environmentComputeType,
            Image: environmentImage,
            EnvironmentVariables: environmentVariables,
          },
          Source: {
            Type: "CODEPIPELINE",
            BuildSpec: buildSpec,
          },
          TimeoutInMinutes: timeoutInMinutes,
        },
      },
      [`${id}Pipeline`]: {
        Type: "AWS::CodePipeline::Pipeline",
        DependsOn: `${id}CodeBuildAndDeploy`,
        Properties: {
          RoleArn: {
            "Fn::GetAtt": [`${id}CodePipelineRole`, "Arn"],
          },
          Stages: [
            {
              Name: "Acquire-Source",
              Actions: [
                {
                  InputArtifacts: [],
                  Name: "Source",
                  ActionTypeId: {
                    Category: "Source",
                    Owner: "ThirdParty",
                    Version: "1",
                    Provider: provider,
                  },
                  OutputArtifacts: [
                    {
                      Name: "SourceOutput",
                    },
                  ],
                  Configuration: {
                    Owner: owner,
                    Repo: repo,
                    Branch: branch,
                    OAuthToken: oauthToken,
                  },
                  RunOrder: 1,
                },
              ],
            },
            {
              Name: "Build-And-Deploy",
              Actions: [
                {
                  Name: "Artifact",
                  ActionTypeId: {
                    Category: "Build",
                    Owner: "AWS",
                    Version: "1",
                    Provider: "CodeBuild",
                  },
                  InputArtifacts: [
                    {
                      Name: "SourceOutput",
                    },
                  ],
                  OutputArtifacts: [
                    {
                      Name: "DeployOutput",
                    },
                  ],
                  Configuration: {
                    ProjectName: {
                      Ref: `${id}CodeBuildAndDeploy`,
                    },
                  },
                  RunOrder: 1,
                },
              ],
            },
          ],
          ArtifactStore: {
            Type: "S3",
            Location: {
              Ref: `${id}PipelineBucket`,
            },
          },
        },
      },
    },
  }),
);
