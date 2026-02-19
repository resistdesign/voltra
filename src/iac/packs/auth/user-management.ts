/**
 * @packageDocumentation
 *
 * Cognito user management pack with optional custom domain, DNS records, and
 * API Gateway permissions for authenticated users.
 */
import { createResourcePack } from "../../utils";

/**
 * Configuration for adding Cognito user management resources.
 */
type AddUserManagementConfigBase = {
  /**
   * Base id for Cognito resources.
   */
  id: string;
  /**
   * IAM role name for authenticated users.
   */
  authRoleName: string;
  /**
   * IAM role name for unauthenticated users.
   */
  unauthRoleName: string;
  /**
   * Alias target DNS name for the base domain record.
   */
  baseDomainRecordAliasTargetDNSName?: any;
  /**
   * API Gateway REST API id for authenticated access.
   */
  apiGatewayRESTAPIId?: any;
  /**
   * API Gateway stage name for authenticated access.
   */
  apiStageName?: any;
};

type AddUserManagementConfigWithDomain = AddUserManagementConfigBase & {
  /**
   * Enable a custom Cognito user pool domain and associated Route53 records.
   *
   * Defaults to `true`.
   */
  enableUserPoolDomain?: true;
  /**
   * Base domain name for the user pool.
   */
  domainName: any;
  /**
   * Hosted zone id for DNS records.
   */
  hostedZoneId: any;
  /**
   * SSL certificate ARN for the user pool domain.
   */
  sslCertificateArn: any;
  /**
   * OAuth callback URLs.
   */
  callbackUrls?: any[];
  /**
   * OAuth logout URLs.
   */
  logoutUrls?: any[];
};

type AddUserManagementConfigWithoutDomain = AddUserManagementConfigBase & {
  /**
   * Disable custom Cognito user pool domain resources.
   */
  enableUserPoolDomain: false;
  domainName?: never;
  hostedZoneId?: never;
  sslCertificateArn?: never;
  baseDomainRecordAliasTargetDNSName?: never;
  callbackUrls?: never;
  logoutUrls?: never;
};

/**
 * Configuration for {@link addUserManagement}.
 */
export type AddUserManagementConfig =
  | AddUserManagementConfigWithDomain
  | AddUserManagementConfigWithoutDomain;

/**
 * Add Cognito user management resources to a template.
 *
 * @param config - User management configuration.
 * @returns CloudFormation template fragment.
 * @group Resource Packs
 */
export const addUserManagement = createResourcePack(
  (config: AddUserManagementConfig) => {
    const {
      id,
      authRoleName,
      unauthRoleName,
      callbackUrls,
      logoutUrls,
      apiGatewayRESTAPIId,
      apiStageName,
    } = config;
    const isUserPoolDomainEnabled = config.enableUserPoolDomain !== false;
    const apiRoleConfig =
      apiGatewayRESTAPIId && apiStageName
        ? {
            [`${id}IdentityPoolRoles`]: {
              Type: "AWS::Cognito::IdentityPoolRoleAttachment",
              Properties: {
                IdentityPoolId: {
                  Ref: `${id}IdentityPool`,
                },
                Roles: {
                  authenticated: {
                    "Fn::GetAtt": [`${id}AuthRole`, "Arn"],
                  },
                  unauthenticated: {
                    "Fn::GetAtt": [`${id}UnauthRole`, "Arn"],
                  },
                },
              },
            },
            [`${id}AuthRole`]: {
              Type: "AWS::IAM::Role",
              Properties: {
                RoleName: authRoleName,
                Path: "/",
                AssumeRolePolicyDocument: {
                  Version: "2012-10-17",
                  Statement: [
                    {
                      Effect: "Allow",
                      Principal: {
                        Federated: "cognito-identity.amazonaws.com",
                      },
                      Action: ["sts:AssumeRoleWithWebIdentity"],
                      Condition: {
                        StringEquals: {
                          "cognito-identity.amazonaws.com:aud": {
                            Ref: `${id}IdentityPool`,
                          },
                        },
                        "ForAnyValue:StringLike": {
                          "cognito-identity.amazonaws.com:amr": "authenticated",
                        },
                      },
                    },
                  ],
                },
                Policies: [
                  {
                    PolicyName: "CognitoAuthorizedPolicy",
                    PolicyDocument: {
                      Version: "2012-10-17",
                      Statement: [
                        {
                          Effect: "Allow",
                          Action: [
                            "mobileanalytics:PutEvents",
                            "cognito-sync:*",
                            "cognito-identity:*",
                          ],
                          Resource: "*",
                        },
                        {
                          Effect: "Allow",
                          Action: ["execute-api:Invoke"],
                          Resource: {
                            "Fn::Sub": [
                              "arn:aws:execute-api:${Region}:${AccountId}:${APIID}/${StageName}/${HTTPVerb}/api/*",
                              {
                                Region: {
                                  Ref: "AWS::Region",
                                },
                                AccountId: {
                                  Ref: "AWS::AccountId",
                                },
                                APIID: apiGatewayRESTAPIId,
                                StageName: apiStageName,
                                HTTPVerb: "*",
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            [`${id}UnauthRole`]: {
              Type: "AWS::IAM::Role",
              Properties: {
                RoleName: unauthRoleName,
                Path: "/",
                AssumeRolePolicyDocument: {
                  Version: "2012-10-17",
                  Statement: [
                    {
                      Effect: "Allow",
                      Principal: {
                        Federated: "cognito-identity.amazonaws.com",
                      },
                      Action: ["sts:AssumeRoleWithWebIdentity"],
                      Condition: {
                        StringEquals: {
                          "cognito-identity.amazonaws.com:aud": {
                            Ref: `${id}IdentityPool`,
                          },
                        },
                        "ForAnyValue:StringLike": {
                          "cognito-identity.amazonaws.com:amr":
                            "unauthenticated",
                        },
                      },
                    },
                  ],
                },
                Policies: [
                  {
                    PolicyName: "CognitoUnauthorizedPolicy",
                    PolicyDocument: {
                      Version: "2012-10-17",
                      Statement: [
                        {
                          Effect: "Allow",
                          Action: [
                            "mobileanalytics:PutEvents",
                            "cognito-sync:*",
                            "cognito-identity:*",
                          ],
                          Resource: "*",
                        },
                      ],
                    },
                  },
                ],
              },
            },
          }
        : {};

    const userPoolDomainConfig =
      config.enableUserPoolDomain === false
        ? {}
        : {
            [`${id}BaseDomainRecord`]:
              !!config.baseDomainRecordAliasTargetDNSName
                ? {
                    Type: "AWS::Route53::RecordSet",
                    DeletionPolicy: "Delete",
                    Properties: {
                      HostedZoneId: config.hostedZoneId,
                      Type: "A",
                      Name: config.domainName,
                      AliasTarget: {
                        HostedZoneId: "Z2FDTNDATAQYW2",
                        DNSName: config.baseDomainRecordAliasTargetDNSName,
                      },
                    },
                  }
                : (undefined as any),
            [`${id}DomainRecord`]: {
              Type: "AWS::Route53::RecordSet",
              DeletionPolicy: "Delete",
              Properties: {
                HostedZoneId: config.hostedZoneId,
                Type: "A",
                Name: {
                  "Fn::Sub": [
                    "auth.${BaseDomainName}",
                    {
                      BaseDomainName: config.domainName,
                    },
                  ],
                },
                AliasTarget: {
                  HostedZoneId: "Z2FDTNDATAQYW2",
                  DNSName: {
                    "Fn::GetAtt": [`${id}Domain`, "CloudFrontDistribution"],
                  },
                },
              },
            },
            [`${id}Domain`]: {
              Type: "AWS::Cognito::UserPoolDomain",
              DependsOn: !!config.baseDomainRecordAliasTargetDNSName
                ? `${id}BaseDomainRecord`
                : undefined,
              Properties: {
                Domain: {
                  "Fn::Sub": [
                    "auth.${BaseDomainName}",
                    {
                      BaseDomainName: config.domainName,
                    },
                  ],
                },
                UserPoolId: {
                  Ref: id,
                },
                CustomDomainConfig: {
                  CertificateArn: config.sslCertificateArn,
                },
              },
            },
          };

    return {
      Resources: {
        [id]: {
          Type: "AWS::Cognito::UserPool",
          Properties: {
            UserPoolName: {
              "Fn::Sub": [`$\{AWS::StackName\}${id}`, {}],
            },
            AccountRecoverySetting: {
              RecoveryMechanisms: [
                {
                  Name: "verified_email",
                  Priority: 1,
                },
              ],
            },
            AdminCreateUserConfig: {
              AllowAdminCreateUserOnly: false,
              UnusedAccountValidityDays: 365,
            },
            AutoVerifiedAttributes: ["email"],
            AliasAttributes: ["phone_number", "email", "preferred_username"],
            Schema: [
              {
                Name: "email",
                Required: true,
                Mutable: true,
              },
              {
                Name: "given_name",
                Required: true,
                Mutable: true,
              },
              {
                Name: "family_name",
                Required: true,
                Mutable: true,
              },
              {
                Name: "phone_number",
                Required: true,
                Mutable: true,
              },
            ],
            DeviceConfiguration: {
              ChallengeRequiredOnNewDevice: true,
              DeviceOnlyRememberedOnUserPrompt: false,
            },
            UsernameConfiguration: {
              CaseSensitive: false,
            },
          },
        },
        [`${id}Client`]: {
          Type: "AWS::Cognito::UserPoolClient",
          Properties: {
            ClientName: {
              "Fn::Sub": [`$\{AWS::StackName\}${id}Client`, {}],
            },
            UserPoolId: {
              Ref: id,
            },
            ...(isUserPoolDomainEnabled
              ? {
                  AllowedOAuthFlowsUserPoolClient: true,
                  AllowedOAuthFlows: ["code", "implicit"],
                  AllowedOAuthScopes: [
                    "openid",
                    "email",
                    "phone",
                    "profile",
                    "aws.cognito.signin.user.admin",
                  ],
                  SupportedIdentityProviders: ["COGNITO"],
                }
              : {
                  AllowedOAuthFlowsUserPoolClient: false,
                }),
            EnableTokenRevocation: true,
            PreventUserExistenceErrors: "ENABLED",
            ...(callbackUrls && callbackUrls.length > 0
              ? { CallbackURLs: callbackUrls }
              : {}),
            ...(logoutUrls && logoutUrls.length > 0
              ? { LogoutURLs: logoutUrls }
              : {}),
          },
        },
        [`${id}IdentityPool`]: {
          Type: "AWS::Cognito::IdentityPool",
          Properties: {
            IdentityPoolName: {
              "Fn::Sub": [`$\{AWS::StackName\}${id}IdentityPool`, {}],
            },
            AllowUnauthenticatedIdentities: false,
            CognitoIdentityProviders: [
              {
                ClientId: {
                  Ref: `${id}Client`,
                },
                ProviderName: {
                  "Fn::GetAtt": [id, "ProviderName"],
                },
                ServerSideTokenCheck: true,
              },
            ],
          },
        },
        ...userPoolDomainConfig,
        ...apiRoleConfig,
      },
    };
  },
);
