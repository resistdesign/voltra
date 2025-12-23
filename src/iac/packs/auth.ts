import { addUserManagement } from "./auth/user-management";
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";

export type AddAuthConfig = {
  userManagementId: string;
  authRoleName: string;
  unauthRoleName: string;
  hostedZoneIdParameterName: string;
  domainNameParameterName: string;
  sslCertificateId: string;
  mainCDNCloudFrontId: string;
  apiCloudFunctionGatewayId: string;
  apiStageName: string;
  adminGroupId: string;
  userManagementAdminGroupName: string;
  callbackUrls: any[];
  logoutUrls: any[];
};

/**
 * Add a user management system.
 * */
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
