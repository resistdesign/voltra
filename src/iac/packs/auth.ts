/**
 * @packageDocumentation
 *
 * Auth pack that composes Cognito user management and adds an admin group.
 * Wraps {@link addUserManagement} and appends a group resource to the template.
 */
import { addUserManagement } from "./auth/user-management";
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";

/**
 * Configuration for the auth pack.
 */
type AddAuthConfigBase = {
  /**
   * Cognito user pool resource id.
   */
  userManagementId: string;
  /**
   * IAM role name for authenticated users.
   */
  authRoleName: string;
  /**
   * IAM role name for unauthenticated users.
   */
  unauthRoleName: string;
  /**
   * API Gateway REST API id for the backend.
   */
  apiCloudFunctionGatewayId: string;
  /**
   * API Gateway stage name for the backend.
   */
  apiStageName: string;
  /**
   * Resource id for the admin group.
   */
  adminGroupId: string;
  /**
   * Cognito group name for admins.
   */
  userManagementAdminGroupName: string;
};

type AddAuthConfigWithUserPoolDomain = AddAuthConfigBase & {
  /**
   * Enable a custom Cognito user pool domain and associated Route53 records.
   *
   * Defaults to `true`.
   */
  enableUserPoolDomain?: true;
  /**
   * Parameter name for Route53 hosted zone id.
   */
  hostedZoneIdParameterName: string;
  /**
   * Parameter name for base domain.
   */
  domainNameParameterName: string;
  /**
   * SSL certificate resource id for the user pool domain.
   */
  sslCertificateId: string;
  /**
   * CloudFront distribution id for the main CDN.
   */
  mainCDNCloudFrontId: string;
  /**
   * OAuth callback URLs.
   */
  callbackUrls: any[];
  /**
   * OAuth logout URLs.
   */
  logoutUrls: any[];
};

type AddAuthConfigWithoutUserPoolDomain = AddAuthConfigBase & {
  /**
   * Disable custom Cognito user pool domain resources.
   */
  enableUserPoolDomain: false;
  hostedZoneIdParameterName?: never;
  domainNameParameterName?: never;
  sslCertificateId?: never;
  mainCDNCloudFrontId?: never;
  callbackUrls?: never;
  logoutUrls?: never;
};

/**
 * Configuration for {@link addAuth}.
 */
export type AddAuthConfig =
  | AddAuthConfigWithUserPoolDomain
  | AddAuthConfigWithoutUserPoolDomain;

/**
 * Add auth resources including user management and an admin group.
 *
 * @group Resource Packs
 */
export const addAuth = createResourcePack((config: AddAuthConfig) => {
  const {
    userManagementId,
    authRoleName,
    unauthRoleName,
    callbackUrls,
    logoutUrls,
    apiCloudFunctionGatewayId,
    apiStageName,
    adminGroupId,
    userManagementAdminGroupName,
  } = config;

  return new SimpleCFT()
    .applyPack(addUserManagement, {
      id: userManagementId,
      authRoleName,
      unauthRoleName,
      apiGatewayRESTAPIId: {
        Ref: apiCloudFunctionGatewayId,
      },
      apiStageName,
      ...(config.enableUserPoolDomain === false
        ? {
            enableUserPoolDomain: false as const,
          }
        : {
            enableUserPoolDomain: true as const,
            domainName: {
              Ref: config.domainNameParameterName,
            },
            hostedZoneId: {
              Ref: config.hostedZoneIdParameterName,
            },
            sslCertificateArn: {
              Ref: config.sslCertificateId,
            },
            baseDomainRecordAliasTargetDNSName: {
              "Fn::GetAtt": [config.mainCDNCloudFrontId, "DomainName"],
            },
            callbackUrls: callbackUrls,
            logoutUrls: logoutUrls,
          }),
    })
    .patch({
      Resources: {
        [adminGroupId]: {
          Type: "AWS::Cognito::UserPoolGroup",
          Properties: {
            GroupName: userManagementAdminGroupName,
            UserPoolId: {
              Ref: userManagementId,
            },
            Description: "Application admin group.",
          },
        },
      },
    }).template;
});
