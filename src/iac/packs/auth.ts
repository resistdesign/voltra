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
   * Enable Cognito Hosted UI/OAuth redirect mode by creating a custom user pool
   * domain plus Route53 records.
   *
   * When enabled, the generated user pool client uses OAuth flows (`code`,
   * `implicit`) and supports callback/logout URL configuration.
   *
   * Defaults to `true`. Set `false` to opt out of Hosted UI resources and use
   * SDK/API-based sign-in flows only.
   */
  enableUserPoolDomain?: true;
  /**
   * Parameter name for the Route53 hosted zone id that owns `domainName`.
   *
   * Required when `enableUserPoolDomain` is not `false`.
   */
  hostedZoneIdParameterName: string;
  /**
   * Parameter name for the base domain used for the auth subdomain.
   *
   * The pack creates a Cognito domain at `auth.<base-domain>`.
   * Required when `enableUserPoolDomain` is not `false`.
   */
  domainNameParameterName: string;
  /**
   * ACM certificate resource id (in `us-east-1`) for the Cognito custom
   * domain.
   *
   * Required when `enableUserPoolDomain` is not `false`.
   */
  sslCertificateId: string;
  /**
   * CloudFront distribution resource id used as the base-domain alias target.
   *
   * This is used for the root/base domain record before creating the auth
   * subdomain record.
   */
  mainCDNCloudFrontId: string;
  /**
   * OAuth callback URLs for Hosted UI/federated redirect flows.
   *
   * These must be valid redirect URLs accepted by Cognito for the app client.
   * They are required by Cognito when OAuth flows are enabled.
   */
  callbackUrls: any[];
  /**
   * OAuth logout redirect URLs for Hosted UI sign-out.
   *
   * These should match the application routes users are redirected to after
   * logout.
   */
  logoutUrls: any[];
  /**
   * Supported identity providers for Hosted UI/OAuth flows.
   *
   * Defaults to `["COGNITO"]`.
   * Use Cognito provider names such as `"COGNITO"`, `"Google"`,
   * `"SignInWithApple"`, `"LoginWithAmazon"`, or names for configured OIDC/SAML
   * providers.
   */
  supportedIdentityProviders?: any[];
};

type AddAuthConfigWithoutUserPoolDomain = AddAuthConfigBase & {
  /**
   * Disable Cognito Hosted UI/OAuth redirect configuration.
   *
   * In this mode, the generated user pool client disables OAuth hosted-UI flows
   * (`AllowedOAuthFlowsUserPoolClient: false`) so callback/logout/provider
   * settings are intentionally disallowed.
   */
  enableUserPoolDomain: false;
  hostedZoneIdParameterName?: never;
  domainNameParameterName?: never;
  sslCertificateId?: never;
  mainCDNCloudFrontId?: never;
  callbackUrls?: never;
  logoutUrls?: never;
  supportedIdentityProviders?: never;
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
    supportedIdentityProviders,
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
            supportedIdentityProviders: supportedIdentityProviders,
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
