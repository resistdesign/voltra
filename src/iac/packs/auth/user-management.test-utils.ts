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
  const minimalClient = minimalResources.UserPoolClient as any;

  const minimalSummary = {
    resourceKeys: Object.keys(minimalResources).sort(),
    hasBaseDomainRecord: "UserPoolBaseDomainRecord" in minimalResources,
    hasIdentityPoolRoles: "UserPoolIdentityPoolRoles" in minimalResources,
    oauthSummary: {
      allowedOAuthFlowsUserPoolClient:
        minimalClient?.Properties?.AllowedOAuthFlowsUserPoolClient,
      allowedOAuthFlows: minimalClient?.Properties?.AllowedOAuthFlows,
      supportedIdentityProviders:
        minimalClient?.Properties?.SupportedIdentityProviders,
      hasCallbackURLs: "CallbackURLs" in (minimalClient?.Properties || {}),
      hasLogoutURLs: "LogoutURLs" in (minimalClient?.Properties || {}),
    },
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

  const customProviderTemplate = new SimpleCFT()
    .applyPack(addUserManagement, {
      id: "UserPool",
      authRoleName: "AuthRole",
      unauthRoleName: "UnauthRole",
      domainName: "example.com",
      hostedZoneId: "HZ123",
      sslCertificateArn: "arn:aws:acm:us-east-1:123:cert/1",
      callbackUrls: ["https://example.com/callback"],
      logoutUrls: ["https://example.com/logout"],
      supportedIdentityProviders: ["COGNITO", "Google", "SignInWithApple"],
    })
    .toJSON();

  const customProviderResources = customProviderTemplate.Resources || {};
  const customProviderClient = customProviderResources.UserPoolClient as any;

  const customProviderSummary = {
    supportedIdentityProviders:
      customProviderClient?.Properties?.SupportedIdentityProviders,
  };

  const noDomainTemplate = new SimpleCFT()
    .applyPack(addUserManagement, {
      id: "UserPool",
      authRoleName: "AuthRole",
      unauthRoleName: "UnauthRole",
      enableUserPoolDomain: false,
    })
    .toJSON();

  const noDomainResources = noDomainTemplate.Resources || {};
  const noDomainClient = noDomainResources.UserPoolClient as any;

  const noDomainSummary = {
    resourceKeys: Object.keys(noDomainResources).sort(),
    hasBaseDomainRecord: "UserPoolBaseDomainRecord" in noDomainResources,
    hasDomain: "UserPoolDomain" in noDomainResources,
    hasDomainRecord: "UserPoolDomainRecord" in noDomainResources,
    hasIdentityPoolRoles: "UserPoolIdentityPoolRoles" in noDomainResources,
    oauthSummary: {
      allowedOAuthFlowsUserPoolClient:
        noDomainClient?.Properties?.AllowedOAuthFlowsUserPoolClient,
      hasAllowedOAuthFlows: "AllowedOAuthFlows" in (noDomainClient?.Properties || {}),
      hasAllowedOAuthScopes:
        "AllowedOAuthScopes" in (noDomainClient?.Properties || {}),
      hasSupportedIdentityProviders:
        "SupportedIdentityProviders" in (noDomainClient?.Properties || {}),
      hasCallbackURLs: "CallbackURLs" in (noDomainClient?.Properties || {}),
      hasLogoutURLs: "LogoutURLs" in (noDomainClient?.Properties || {}),
    },
  };

  return {
    minimalSummary,
    apiSummary,
    noDomainSummary,
    customProviderSummary,
  };
};
