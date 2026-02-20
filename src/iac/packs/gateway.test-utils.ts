import { SimpleCFT } from "../SimpleCFT";
import { addGateway } from "./gateway";

export const runGatewayPackScenario = () => {
  const defaultTemplate = new SimpleCFT()
    .applyPack(addGateway, {
      id: "ApiGateway",
      hostedZoneId: "HZ123",
      domainName: "api.example.com",
      certificateArn: "arn:aws:acm:us-east-1:123:cert/1",
      cloudFunction: {
        id: "ApiFunction",
        region: "us-east-1",
      },
    })
    .toJSON();

  const customTemplate = new SimpleCFT()
    .applyPack(addGateway, {
      id: "ApiGateway",
      hostedZoneId: "HZ456",
      domainName: "api.example.com",
      certificateArn: "arn:aws:acm:us-east-1:123:cert/2",
      cloudFunction: {
        id: "ApiFunction",
        region: "us-east-1",
      },
      stageName: "prod",
      deploymentSuffix: "V2",
      authorizer: {
        providerARNs: ["arn:aws:cognito:us-east-1:123:userpool/1"],
        scopes: ["email"],
        type: "TOKEN",
        identitySource: "method.request.header.Authorization",
      },
    })
    .toJSON();

  const defaultResources = defaultTemplate.Resources || {};
  const customResources = customTemplate.Resources || {};
  const defaultMethod = defaultResources.ApiGatewayGatewayRESTAPIMethod as any;
  const customMethod = customResources.ApiGatewayGatewayRESTAPIMethod as any;
  const defaultStage =
    defaultResources.ApiGatewayGatewayRESTAPIEnvironment as any;
  const customStage =
    customResources.ApiGatewayGatewayRESTAPIEnvironment as any;
  const defaultRoute53 = defaultResources.ApiGatewayRoute53Record as any;
  const customAuthorizer = customResources.ApiGatewayCustomAuthorizer as any;

  return {
    resourceKeys: Object.keys(defaultResources).sort(),
    defaultAuthType: defaultMethod?.Properties?.AuthorizationType,
    defaultStageName: defaultStage?.Properties?.StageName,
    defaultDeploymentId: defaultStage?.Properties?.DeploymentId?.Ref,
    defaultIntegrationUri:
      defaultMethod?.Properties?.Integration?.Uri?.["Fn::Sub"],
    defaultRoute53RecordType: defaultRoute53?.Properties?.Type,
    customAuthType: customMethod?.Properties?.AuthorizationType,
    customAuthScopes: customMethod?.Properties?.AuthorizationScopes,
    customAuthorizerRef: customMethod?.Properties?.AuthorizerId?.Ref,
    customAuthorizerIdentitySource:
      customAuthorizer?.Properties?.IdentitySource,
    customAuthorizerProviderARNs: customAuthorizer?.Properties?.ProviderARNs,
    customStageName: customStage?.Properties?.StageName,
    customDeploymentId: customStage?.Properties?.DeploymentId?.Ref,
  };
};

export const runGatewayPackResourceKeysScenario = async () =>
  (await runGatewayPackScenario()).resourceKeys;

export const runGatewayPackDefaultAuthTypeScenario = async () =>
  (await runGatewayPackScenario()).defaultAuthType;

export const runGatewayPackDefaultStageNameScenario = async () =>
  (await runGatewayPackScenario()).defaultStageName;

export const runGatewayPackDefaultDeploymentIdScenario = async () =>
  (await runGatewayPackScenario()).defaultDeploymentId;

export const runGatewayPackDefaultIntegrationUriScenario = async () =>
  (await runGatewayPackScenario()).defaultIntegrationUri;

export const runGatewayPackDefaultRoute53RecordTypeScenario = async () =>
  (await runGatewayPackScenario()).defaultRoute53RecordType;

export const runGatewayPackCustomAuthTypeScenario = async () =>
  (await runGatewayPackScenario()).customAuthType;

export const runGatewayPackCustomAuthScopesScenario = async () =>
  (await runGatewayPackScenario()).customAuthScopes;

export const runGatewayPackCustomAuthorizerRefScenario = async () =>
  (await runGatewayPackScenario()).customAuthorizerRef;

export const runGatewayPackCustomAuthorizerIdentitySourceScenario = async () =>
  (await runGatewayPackScenario()).customAuthorizerIdentitySource;

export const runGatewayPackCustomAuthorizerProviderARNsScenario = async () =>
  (await runGatewayPackScenario()).customAuthorizerProviderARNs;

export const runGatewayPackCustomStageNameScenario = async () =>
  (await runGatewayPackScenario()).customStageName;

export const runGatewayPackCustomDeploymentIdScenario = async () =>
  (await runGatewayPackScenario()).customDeploymentId;
