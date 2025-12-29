import { SimpleCFT } from "../SimpleCFT";
import { addAuth } from "./auth";

export const runAuthPackScenario = () => {
  const simpleCFT = new SimpleCFT();
  const template = simpleCFT
    .applyPack(addAuth, {
      userManagementId: "UserPool",
      authRoleName: "AuthRole",
      unauthRoleName: "UnauthRole",
      hostedZoneIdParameterName: "HostedZoneId",
      domainNameParameterName: "DomainName",
      sslCertificateId: "CertificateArn",
      mainCDNCloudFrontId: "MainCDN",
      apiCloudFunctionGatewayId: "ApiGateway",
      apiStageName: "prod",
      adminGroupId: "AdminGroup",
      userManagementAdminGroupName: "admins",
      callbackUrls: ["https://example.com/callback"],
      logoutUrls: ["https://example.com/logout"],
    })
    .toJSON();

  const resources = template.Resources || {};
  const adminGroup = resources.AdminGroup as any;
  const authRole = resources.UserPoolAuthRole as any;
  const unauthRole = resources.UserPoolUnauthRole as any;

  return {
    resourceKeys: Object.keys(resources).sort(),
    adminGroupName: adminGroup?.Properties?.GroupName,
    authRoleName: authRole?.Properties?.RoleName,
    unauthRoleName: unauthRole?.Properties?.RoleName,
    hasBaseDomainRecord: "UserPoolBaseDomainRecord" in resources,
    hasIdentityPoolRoles: "UserPoolIdentityPoolRoles" in resources,
  };
};
