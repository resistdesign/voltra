import { SimpleCFT } from "../SimpleCFT";
import { addAuth } from "./auth";

export const runAuthPackScenario = () => {
  const withDomainTemplate = new SimpleCFT()
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

  const withDomainResources = withDomainTemplate.Resources || {};
  const withDomainAdminGroup = withDomainResources.AdminGroup as any;
  const withDomainAuthRole = withDomainResources.UserPoolAuthRole as any;
  const withDomainUnauthRole = withDomainResources.UserPoolUnauthRole as any;

  const withoutDomainTemplate = new SimpleCFT()
    .applyPack(addAuth, {
      userManagementId: "UserPool",
      authRoleName: "AuthRole",
      unauthRoleName: "UnauthRole",
      enableUserPoolDomain: false,
      apiCloudFunctionGatewayId: "ApiGateway",
      apiStageName: "prod",
      adminGroupId: "AdminGroup",
      userManagementAdminGroupName: "admins",
    })
    .toJSON();

  const withoutDomainResources = withoutDomainTemplate.Resources || {};

  return {
    withDomainSummary: {
      resourceKeys: Object.keys(withDomainResources).sort(),
      adminGroupName: withDomainAdminGroup?.Properties?.GroupName,
      authRoleName: withDomainAuthRole?.Properties?.RoleName,
      unauthRoleName: withDomainUnauthRole?.Properties?.RoleName,
      hasBaseDomainRecord: "UserPoolBaseDomainRecord" in withDomainResources,
      hasDomain: "UserPoolDomain" in withDomainResources,
      hasDomainRecord: "UserPoolDomainRecord" in withDomainResources,
      hasIdentityPoolRoles: "UserPoolIdentityPoolRoles" in withDomainResources,
    },
    withoutDomainSummary: {
      resourceKeys: Object.keys(withoutDomainResources).sort(),
      hasBaseDomainRecord: "UserPoolBaseDomainRecord" in withoutDomainResources,
      hasDomain: "UserPoolDomain" in withoutDomainResources,
      hasDomainRecord: "UserPoolDomainRecord" in withoutDomainResources,
      hasIdentityPoolRoles:
        "UserPoolIdentityPoolRoles" in withoutDomainResources,
    },
  };
};
