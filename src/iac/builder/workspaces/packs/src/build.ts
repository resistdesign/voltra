import { createResourcePack } from '@aws-cf-builder/utils';
import { AWS } from '@aws-cf-builder/types';

export const DEFAULT_BUILD_PIPELINE_REPO_PROVIDER = 'GitHub';

export type BuildPipelineRepoConfig = {
  provider?: any;
  owner: any;
  repo: any;
  branch: any;
  oauthToken: any;
};

export type AddBuildPipelineConfig = {
  id: string;
  buildSpec: any;
  dependsOn?: string | string[];
  environmentVariables?: AWS.CodeBuild.Project.EnvironmentVariable[];
  timeoutInMinutes?: number;
  environmentType?: 'ARM_CONTAINER' | 'LINUX_CONTAINER' | 'LINUX_GPU_CONTAINER' | 'WINDOWS_SERVER_2019_CONTAINER' | string;
  environmentComputeType?: 'BUILD_GENERAL1_LARGE' | 'BUILD_GENERAL1_SMALL' | 'BUILD_GENERAL1_MEDIUM' | 'BUILD_GENERAL1_2XLARGE' | string;
  environmentImage?: string;
  repoConfig: BuildPipelineRepoConfig;
};

/**
 * Add a build pipeline with full permissions.
 */
export const addBuildPipeline = createResourcePack(
  ({
     id,
     buildSpec,
     dependsOn,
     environmentVariables,
     timeoutInMinutes = 10,
     environmentType = 'LINUX_CONTAINER',
     environmentComputeType = 'BUILD_GENERAL1_SMALL',
     environmentImage = 'aws/codebuild/nodejs:10.14.1',
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
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: ['codebuild.amazonaws.com'],
                },
                Action: ['sts:AssumeRole'],
              },
            ],
          },
          Path: '/',
          Policies: [
            {
              PolicyName: 'codebuild-service',
              PolicyDocument: {
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*',
                  },
                ],
                Version: '2012-10-17',
              },
            },
          ],
        },
      },
      [`${id}CodePipelineRole`]: {
        Type: 'AWS::IAM::Role',
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  Service: ['codepipeline.amazonaws.com'],
                },
                Action: ['sts:AssumeRole'],
              },
            ],
          },
          Path: '/',
          Policies: [
            {
              PolicyName: 'codepipeline-service',
              PolicyDocument: {
                Statement: [
                  {
                    Action: ['codebuild:*'],
                    Resource: '*',
                    Effect: 'Allow',
                  },
                  {
                    Action: ['s3:GetObject', 's3:GetObjectVersion', 's3:GetBucketVersioning'],
                    Resource: '*',
                    Effect: 'Allow',
                  },
                  {
                    Action: ['s3:PutObject'],
                    Resource: ['arn:aws:s3:::codepipeline*'],
                    Effect: 'Allow',
                  },
                  {
                    Action: ['s3:*', 'cloudformation:*', 'iam:PassRole'],
                    Resource: '*',
                    Effect: 'Allow',
                  },
                ],
                Version: '2012-10-17',
              },
            },
          ],
        },
      },
      [`${id}PipelineBucket`]: {
        Type: 'AWS::S3::Bucket',
        DeletionPolicy: 'Delete',
        Properties: {
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [
              {
                ServerSideEncryptionByDefault: {
                  SSEAlgorithm: 'AES256',
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
        Type: 'AWS::CodeBuild::Project',
        DependsOn: dependsOn,
        Properties: {
          Name: {
            'Fn::Sub': `\${AWS::StackName}-${id}CodeBuildAndDeploy`,
          },
          Description: 'Deploy site to S3',
          ServiceRole: {
            'Fn::GetAtt': [`${id}CodeBuildRole`, 'Arn'],
          },
          Artifacts: {
            Type: 'CODEPIPELINE',
          },
          Environment: {
            Type: environmentType,
            ComputeType: environmentComputeType,
            Image: environmentImage,
            EnvironmentVariables: environmentVariables,
          },
          Source: {
            Type: 'CODEPIPELINE',
            BuildSpec: buildSpec,
          },
          TimeoutInMinutes: timeoutInMinutes,
        },
      },
      [`${id}Pipeline`]: {
        Type: 'AWS::CodePipeline::Pipeline',
        DependsOn: `${id}CodeBuildAndDeploy`,
        Properties: {
          RoleArn: {
            'Fn::GetAtt': [`${id}CodePipelineRole`, 'Arn'],
          },
          Stages: [
            {
              Name: 'Acquire-Source',
              Actions: [
                {
                  InputArtifacts: [],
                  Name: 'Source',
                  ActionTypeId: {
                    Category: 'Source',
                    Owner: 'ThirdParty',
                    Version: '1',
                    Provider: provider,
                  },
                  OutputArtifacts: [
                    {
                      Name: 'SourceOutput',
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
              Name: 'Build-And-Deploy',
              Actions: [
                {
                  Name: 'Artifact',
                  ActionTypeId: {
                    Category: 'Build',
                    Owner: 'AWS',
                    Version: '1',
                    Provider: 'CodeBuild',
                  },
                  InputArtifacts: [
                    {
                      Name: 'SourceOutput',
                    },
                  ],
                  OutputArtifacts: [
                    {
                      Name: 'DeployOutput',
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
            Type: 'S3',
            Location: {
              Ref: `${id}PipelineBucket`,
            },
          },
        },
      },
    },
  }),
);
