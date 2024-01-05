import { SimpleCFT } from '@aws-cf-builder/utils';
import {
  addBuildPipeline,
  addCDN,
  addCloudFunction,
  addGateway,
  addSecureFileStorage,
  createBuildSpec,
} from '@aws-cf-builder/packs';
import { PARAMETERS, STACK_IDS, USER_MANAGEMENT_ASSET_NAMES } from './constants';
import { addSSLCertificate } from './packs/ssl-certificate';
import { v4 as UUIDV4 } from 'uuid';
import { addDNS } from './packs/dns';
import { addRepo } from './packs/repo';
import { addAuth } from './packs/auth';
import { addDatabase } from './packs/database';

const DEPLOYMENT_INSTANCE_ID = UUIDV4().replace(/-/gim, () => '');
const STAGE_NAME = 'production';
const { HostedZoneId, DomainName, RepoOwner, RepoName, RepoBranch, RepoToken, OpenAIAPIKey, OpenAIModelId } =
  PARAMETERS;
const {
  LocalUIDevelopmentDomainName,
  UserManagement,
  AdminGroup,
  APICloudFunction,
  APICloudFunctionGateway,
  SSLCertificate,
  LiveUIFiles,
  LiveAPIFiles,
  MainCDN,
  UIBuildPipeline,
  APIBuildPipeline,
  MainCDNCloudFront,
  DatabaseMessageHistoryTable,
  DatabaseUserInfoTable,
} = STACK_IDS;
const {
  ROLE_NAMES: { AUTH: USER_MANAGEMENT_AUTH_ROLE_NAME, UNAUTH: USER_MANAGEMENT_UNAUTH_ROLE_NAME },
  GROUPS: { ADMIN: USER_MANAGEMENT_ADMIN_GROUP },
} = USER_MANAGEMENT_ASSET_NAMES;
const USER_MANAGEMENT_CONFIG = {
  CALLBACK_URLS: [
    {
      'Fn::Sub': [
        'https://app.${BaseDomainName}/login-complete',
        {
          BaseDomainName: { Ref: DomainName },
        },
      ],
    },
    {
      'Fn::Sub': [
        'https://app-local.${BaseDomainName}:1234/login-complete',
        {
          BaseDomainName: { Ref: DomainName },
        },
      ],
    },
  ],
  LOGOUT_URLS: [
    {
      'Fn::Sub': [
        'https://app.${BaseDomainName}/logout-complete',
        {
          BaseDomainName: { Ref: DomainName },
        },
      ],
    },
    {
      'Fn::Sub': [
        'https://app-local.${BaseDomainName}:1234/logout-complete',
        {
          BaseDomainName: { Ref: DomainName },
        },
      ],
    },
  ],
};

export default new SimpleCFT()
  .addParameterGroup({
    Label: 'Open AI',
    Parameters: {
      [OpenAIAPIKey]: {
        Label: 'Open AI API Key',
        Description: 'The API key for Open AI.',
        Type: 'String',
        NoEcho: true,
      },
      [OpenAIModelId]: {
        Label: 'Open AI Model ID',
        Description: 'The model ID for Open AI.',
        Type: 'String',
        NoEcho: true,
      },
    },
  })
  .applyPack(
    {
      hostedZoneIdParameterName: HostedZoneId,
      domainNameParameterName: DomainName,
      localUIDevelopmentDomainName: LocalUIDevelopmentDomainName,
    },
    addDNS
  )
  .applyPack(
    {
      repoOwnerParameterName: RepoOwner,
      repoNameParameterName: RepoName,
      repoBranchParameterName: RepoBranch,
      repoTokenParameterName: RepoToken,
    },
    addRepo
  )
  .applyPack(
    {
      id: SSLCertificate,
      domainName: {
        Ref: DomainName,
      },
      hostedZoneId: {
        Ref: HostedZoneId,
      },
    },
    addSSLCertificate
  )
  .applyPack(
    {
      id: LiveUIFiles,
      bucketName: {
        'Fn::Sub': [
          'app.${BaseDomainName}',
          {
            BaseDomainName: { Ref: DomainName },
          },
        ],
      },
      cors: true,
      shouldDelete: true,
      blockPublicAccess: false,
      allowACLs: true,
    },
    addSecureFileStorage
  )
  .applyPack(
    {
      id: LiveAPIFiles,
      bucketName: {
        'Fn::Sub': [
          'api-files.${BaseDomainName}',
          {
            BaseDomainName: { Ref: DomainName },
          },
        ],
      },
      shouldDelete: false,
      blockPublicAccess: true,
    },
    addSecureFileStorage
  )
  .applyPack(
    {
      id: MainCDN,
      domainName: {
        'Fn::Sub': [
          'app.${BaseDomainName}',
          {
            BaseDomainName: { Ref: DomainName },
          },
        ],
      },
      hostedZoneId: {
        Ref: HostedZoneId,
      },
      certificateArn: {
        Ref: 'SSLCertificate',
      },
      fileStorageId: 'LiveUIFiles',
    },
    addCDN
  )
  .applyPack(
    {
      userManagementId: UserManagement,
      authRoleName: USER_MANAGEMENT_AUTH_ROLE_NAME,
      unauthRoleName: USER_MANAGEMENT_UNAUTH_ROLE_NAME,
      hostedZoneIdParameterName: HostedZoneId,
      domainNameParameterName: DomainName,
      sslCertificateId: SSLCertificate,
      mainCDNCloudFrontId: MainCDNCloudFront,
      apiCloudFunctionGatewayId: APICloudFunctionGateway,
      apiStageName: STAGE_NAME,
      adminGroupId: AdminGroup,
      userManagementAdminGroupName: USER_MANAGEMENT_ADMIN_GROUP,
      callbackUrls: USER_MANAGEMENT_CONFIG.CALLBACK_URLS,
      logoutUrls: USER_MANAGEMENT_CONFIG.LOGOUT_URLS,
    },
    addAuth
  )
  .applyPack(
    {
      id: APICloudFunction,
      environment: {
        Variables: {
          CLIENT_ORIGIN: {
            'Fn::Sub': [
              'https://app.${BaseDomainName}',
              {
                BaseDomainName: { Ref: DomainName },
              },
            ],
          },
          DEV_CLIENT_ORIGIN: {
            'Fn::Sub': [
              'https://app-local.${BaseDomainName}:1234',
              {
                BaseDomainName: { Ref: DomainName },
              },
            ],
          },
          DATABASE_MESSAGE_HISTORY_TABLE_NAME: {
            Ref: DatabaseMessageHistoryTable,
          },
          DATABASE_USER_INFO_TABLE_NAME: {
            Ref: DatabaseUserInfoTable,
          },
          S3_API_BUCKET_NAME: {
            Ref: LiveAPIFiles,
          },
          OPEN_AI_API_KEY: {
            Ref: OpenAIAPIKey,
          },
          OPEN_AI_MODEL_ID: {
            Ref: OpenAIModelId,
          },
        },
      },
      runtime: 'nodejs18.x' as any,
    },
    addCloudFunction
  )
  .applyPack(
    {
      id: APICloudFunctionGateway,
      certificateArn: {
        Ref: 'SSLCertificate',
      },
      hostedZoneId: {
        Ref: HostedZoneId,
      },
      domainName: {
        'Fn::Sub': [
          'api.${BaseDomainName}',
          {
            BaseDomainName: { Ref: DomainName },
          },
        ],
      },
      stageName: STAGE_NAME,
      cloudFunction: {
        id: APICloudFunction,
      },
      authorizer: {
        providerARNs: [
          {
            // TODO: How to expose pack component names???
            'Fn::GetAtt': [`${UserManagement}UserPool`, 'Arn'],
          } as any,
        ],
      },
      deploymentSuffix: `V${DEPLOYMENT_INSTANCE_ID}`,
    },
    addGateway
  )
  .applyPack(
    {
      id: UIBuildPipeline,
      dependsOn: [LiveUIFiles, `${MainCDN}CloudFront`],
      environmentComputeType: 'BUILD_GENERAL1_SMALL',
      environmentImage: 'aws/codebuild/standard:6.0',
      environmentType: 'LINUX_CONTAINER',
      environmentVariables: [
        {
          Name: 'APP_DOMAIN',
          Type: 'PLAINTEXT',
          Value: {
            'Fn::Sub': [
              'app.${BaseDomainName}',
              {
                BaseDomainName: {
                  Ref: DomainName,
                },
              },
            ],
          },
        },
        {
          Name: 'API_DOMAIN',
          Type: 'PLAINTEXT',
          Value: {
            'Fn::Sub': [
              'api.${BaseDomainName}',
              {
                BaseDomainName: {
                  Ref: DomainName,
                },
              },
            ],
          },
        },
        {
          Name: 'USER_POOL_CLIENT_COOKIE_DOMAIN',
          Type: 'PLAINTEXT',
          Value: {
            'Fn::Sub': [
              '.${BaseDomainName}',
              {
                BaseDomainName: {
                  Ref: DomainName,
                },
              },
            ],
          },
        },
        {
          Name: 'USER_POOL_CLIENT_ID',
          Type: 'PLAINTEXT',
          Value: {
            Ref: `${UserManagement}UserPoolClient`,
          },
        },
        {
          Name: 'OAUTH_CONFIG_DOMAIN',
          Type: 'PLAINTEXT',
          Value: {
            'Fn::Sub': [
              'https://cognito-idp.${UserPoolRegion}.amazonaws.com/${UserPoolID}',
              {
                UserPoolRegion: {
                  Ref: 'AWS::Region',
                },
                UserPoolID: {
                  Ref: `${UserManagement}UserPool`,
                },
              },
            ],
          },
        },
        {
          Name: 'USER_POOL_CLIENT_DOMAIN',
          Type: 'PLAINTEXT',
          Value: {
            'Fn::Sub': [
              'auth.${BaseDomainName}',
              {
                BaseDomainName: {
                  Ref: DomainName,
                },
              },
            ],
          },
        },
        {
          Name: 'USER_POOL_CLIENT_CALLBACK_URL',
          Type: 'PLAINTEXT',
          Value: USER_MANAGEMENT_CONFIG.CALLBACK_URLS[0],
        },
        {
          Name: 'USER_POOL_CLIENT_LOGOUT_URL',
          Type: 'PLAINTEXT',
          Value: USER_MANAGEMENT_CONFIG.LOGOUT_URLS[0],
        },
      ],
      timeoutInMinutes: 10,
      buildSpec: {
        'Fn::Sub': [
          createBuildSpec({
            version: 0.2,
            phases: {
              install: {
                'runtime-versions': {
                  nodejs: 16,
                },
                commands: ['n 18', 'npm i yarn', 'yarn'],
              },
              build: {
                commands: ['yarn build:app'],
              },
              post_build: {
                commands: [
                  'aws s3 cp --recursive --acl public-read ${OutputDirectory} s3://${FullDomainName}/',
                  'aws cloudfront create-invalidation --distribution-id "${DistributionId}" --paths "/*"',
                ],
              },
            },
          }),
          {
            FullDomainName: {
              Ref: LiveUIFiles,
            },
            DistributionId: {
              Ref: `${MainCDN}CloudFront`,
            },
            OutputDirectory: './dist/app',
          },
        ],
      },
      repoConfig: {
        owner: {
          Ref: RepoOwner,
        },
        repo: {
          Ref: RepoName,
        },
        branch: {
          Ref: RepoBranch,
        },
        oauthToken: {
          Ref: RepoToken,
        },
      },
    },
    addBuildPipeline
  )
  .applyPack(
    {
      id: APIBuildPipeline,
      dependsOn: [APICloudFunction],
      environmentComputeType: 'BUILD_GENERAL1_SMALL',
      environmentImage: 'aws/codebuild/standard:6.0',
      environmentType: 'LINUX_CONTAINER',
      environmentVariables: [],
      timeoutInMinutes: 10,
      buildSpec: {
        'Fn::Sub': [
          createBuildSpec({
            version: 0.2,
            phases: {
              install: {
                'runtime-versions': {
                  nodejs: 16,
                },
                commands: ['n 18', 'npm i yarn', 'yarn'],
              },
              build: {
                commands: ['yarn build:api'],
              },
              post_build: {
                commands: [
                  'PWD_RETURN_DIR="${!PWD}"',
                  'cd ${OutputDirectory} && zip -qr ../${ZipFileName}.zip * && cd ${!PWD_RETURN_DIR}',
                  'aws lambda update-function-code --function-name "${APIFunctionArn}" --zip-file "fileb://${ZipFileDirectory}${ZipFileName}.zip"',
                ],
              },
            },
          }),
          {
            APIFunctionArn: {
              'Fn::GetAtt': [APICloudFunction, 'Arn'],
            },
            OutputDirectory: './dist/api',
            ZipFileName: 'api',
            ZipFileDirectory: './dist/',
          },
        ],
      },
      repoConfig: {
        owner: {
          Ref: RepoOwner,
        },
        repo: {
          Ref: RepoName,
        },
        branch: {
          Ref: RepoBranch,
        },
        oauthToken: {
          Ref: RepoToken,
        },
      },
    },
    addBuildPipeline
  )
  .applyPack(
    {
      tableId: DatabaseMessageHistoryTable,
      attributes: {
        userId: 'S',
        timestamp: 'S',
      },
      keys: {
        userId: 'HASH',
        timestamp: 'RANGE',
      },
      billingMode: 'PAY_PER_REQUEST',
    },
    addDatabase
  )
  .applyPack(
    {
      tableId: DatabaseUserInfoTable,
      attributes: {
        userId: 'S',
        timestamp: 'S',
      },
      keys: {
        userId: 'HASH',
        timestamp: 'RANGE',
      },
      billingMode: 'PAY_PER_REQUEST',
    },
    addDatabase
  ).template;
