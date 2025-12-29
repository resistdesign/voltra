import { addUserManagement } from "./user-management";
import { SimpleCFT } from "../../SimpleCFT";

export const runUserManagementPackScenario = () => {
  const minimalTemplate = new SimpleCFT()
    .applyPack(addUserManagement, {
      id: "UserPool",
      authRoleName: "AuthRole",
      unauthRoleName: "UnauthRole",
      domainName: "example.com",
      hostedZoneId: "HZ123",
      sslCertificateArn: "arn:aws:acm:us-east-1:123:cert/1",
      callbackUrls: ["https://example.com/callback"],
      logoutUrls: ["https://example.com/logout"],
    })
    .toJSON();

  const minimalResources = minimalTemplate.Resources || {};

  const minimalSummary = {
    resourceKeys: Object.keys(minimalResources).sort(),
    hasBaseDomainRecord: "UserPoolBaseDomainRecord" in minimalResources,
    hasIdentityPoolRoles: "UserPoolIdentityPoolRoles" in minimalResources,
  };

  const apiTemplate = new SimpleCFT()
    .applyPack(addUserManagement, {
      id: "UserPool",
      authRoleName: "AuthRole",
      unauthRoleName: "UnauthRole",
      domainName: "example.com",
      hostedZoneId: "HZ123",
      sslCertificateArn: "arn:aws:acm:us-east-1:123:cert/1",
      callbackUrls: ["https://example.com/callback"],
      logoutUrls: ["https://example.com/logout"],
      baseDomainRecordAliasTargetDNSName: "cdn.example.com",
      apiGatewayRESTAPIId: "ApiGateway",
      apiStageName: "prod",
    })
    .toJSON();

  const apiResources = apiTemplate.Resources || {};
  const authRole = apiResources.UserPoolAuthRole as any;
  const unauthRole = apiResources.UserPoolUnauthRole as any;

  const apiSummary = {
    hasBaseDomainRecord: "UserPoolBaseDomainRecord" in apiResources,
    hasIdentityPoolRoles: "UserPoolIdentityPoolRoles" in apiResources,
    authRoleName: authRole?.Properties?.RoleName,
    unauthRoleName: unauthRole?.Properties?.RoleName,
  };

  return {
    minimalSummary,
    apiSummary,
  };
};
