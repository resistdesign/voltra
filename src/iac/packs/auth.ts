import { addUserManagement } from "./abstract/user-management";
import { createResourcePack, SimpleCFT } from "../utils";

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
      .applyPack(
        {
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
        },
        addUserManagement,
      )
      .patch({
        Resources: {
          [adminGroupId]: {
            Type: "AWS::Cognito::UserPoolGroup",
            Properties: {
              GroupName: userManagementAdminGroupName,
              UserPoolId: {
                Ref: `${userManagementId}UserPool`,
              },
              Description: "Application admin group.",
            },
          },
        },
      }).template,
);
