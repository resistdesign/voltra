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
export type AddAuthConfig = {
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
  /**
   * OAuth callback URLs.
   */
  callbackUrls: any[];
  /**
   * OAuth logout URLs.
   */
  logoutUrls: any[];
};

/**
 * Add a user management system.
 *
 * @param config - Auth pack configuration.
 * */
/**
 * Add auth resources including user management and an admin group.
 */
export const addAuth = createResourcePack(
  ({
    userManagementId,
    authRoleName,
    unauthRoleName,
    hostedZoneIdParameterName,
    domainNameParameterName,
    sslCertificateId,
    callbackUrls,
    logoutUrls,
    mainCDNCloudFrontId,
    apiCloudFunctionGatewayId,
    apiStageName,
    adminGroupId,
    userManagementAdminGroupName,
  }: AddAuthConfig) =>
    new SimpleCFT()
      .applyPack(addUserManagement, {
        id: userManagementId,
        authRoleName,
        unauthRoleName,
        domainName: {
          Ref: domainNameParameterName,
        },
        hostedZoneId: {
          Ref: hostedZoneIdParameterName,
        },
        sslCertificateArn: {
          Ref: sslCertificateId,
        },
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
        baseDomainRecordAliasTargetDNSName: {
          "Fn::GetAtt": [mainCDNCloudFrontId, "DomainName"],
        },
        apiGatewayRESTAPIId: {
          Ref: apiCloudFunctionGatewayId,
        },
        apiStageName,
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
      }).template,
);
