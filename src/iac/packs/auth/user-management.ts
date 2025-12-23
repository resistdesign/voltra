import { createResourcePack } from "../../utils";

export type AddUserManagementConfig = {
  id: string;
  authRoleName: string;
  unauthRoleName: string;
  domainName: any;
  hostedZoneId: any;
  sslCertificateArn: any;
  callbackUrls?: any[];
  logoutUrls?: any[];
  baseDomainRecordAliasTargetDNSName?: any;
  apiGatewayRESTAPIId?: any;
  apiStageName?: any;
};

export const addUserManagement = createResourcePack(
  ({
    id,
    authRoleName,
    unauthRoleName,
    domainName,
    hostedZoneId,
    sslCertificateArn,
    callbackUrls,
    logoutUrls,
    baseDomainRecordAliasTargetDNSName,
    apiGatewayRESTAPIId,
    apiStageName,
  }: AddUserManagementConfig) => {
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
        [`${id}BaseDomainRecord`]: !!baseDomainRecordAliasTargetDNSName
          ? {
              Type: "AWS::Route53::RecordSet",
              DeletionPolicy: "Delete",
              Properties: {
                HostedZoneId: hostedZoneId,
                Type: "A",
                Name: domainName,
                AliasTarget: {
                  HostedZoneId: "Z2FDTNDATAQYW2",
                  DNSName: baseDomainRecordAliasTargetDNSName,
                },
              },
            }
          : (undefined as any),
        [`${id}DomainRecord`]: {
          Type: "AWS::Route53::RecordSet",
          DeletionPolicy: "Delete",
          Properties: {
            HostedZoneId: hostedZoneId,
            Type: "A",
            Name: {
              "Fn::Sub": [
                "auth.${BaseDomainName}",
                {
                  BaseDomainName: domainName,
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
          DependsOn: !!baseDomainRecordAliasTargetDNSName
            ? `${id}BaseDomainRecord`
            : undefined,
          Properties: {
            Domain: {
              "Fn::Sub": [
                "auth.${BaseDomainName}",
                {
                  BaseDomainName: domainName,
                },
              ],
            },
            UserPoolId: {
              Ref: id,
            },
            CustomDomainConfig: {
              CertificateArn: sslCertificateArn,
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
            AllowedOAuthFlowsUserPoolClient: true,
            AllowedOAuthFlows: ["code", "implicit"],
            AllowedOAuthScopes: [
              "openid",
              "email",
              "phone",
              "profile",
              "aws.cognito.signin.user.admin",
            ],
            CallbackURLs: callbackUrls,
            LogoutURLs: logoutUrls,
            EnableTokenRevocation: true,
            PreventUserExistenceErrors: "ENABLED",
            SupportedIdentityProviders: ["COGNITO"],
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
        ...apiRoleConfig,
      },
    };
  },
);
