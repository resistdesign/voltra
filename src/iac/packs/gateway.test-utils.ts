import { SimpleCFT } from "../SimpleCFT";
import { addGateway } from "./gateway";
import type { AddGatewayConfig } from "./gateway";

const BASE_GATEWAY_CONFIG: AddGatewayConfig = {
  id: "ApiGateway",
  hostedZoneId: "HZ123",
  domainName: "api.example.com",
  certificateArn: "arn:aws:acm:us-east-1:123:cert/1",
  cloudFunction: {
    id: "ApiFunction",
    region: "us-east-1",
  },
};

const getGatewayTemplate = (config: Partial<AddGatewayConfig> = {}) =>
  new SimpleCFT()
    .applyPack(addGateway, {
      ...BASE_GATEWAY_CONFIG,
      ...config,
      cloudFunction: {
        ...BASE_GATEWAY_CONFIG.cloudFunction,
        ...(config.cloudFunction || {}),
      },
    })
    .toJSON();

const getDeploymentResourceKey = (resources: Record<string, unknown>) =>
  Object.keys(resources).find((key) =>
    key.startsWith("ApiGatewayGatewayRESTAPIDeployment"),
  );

export const runGatewayPackScenario = () => {
  const defaultTemplate = getGatewayTemplate();
  const customTemplate = getGatewayTemplate({
    hostedZoneId: "HZ456",
    certificateArn: "arn:aws:acm:us-east-1:123:cert/2",
    stageName: "prod",
    deploymentSuffix: "V2",
    authorizer: {
      providerARNs: ["arn:aws:cognito:us-east-1:123:userpool/1"],
      scopes: ["email"],
      type: "TOKEN",
      identitySource: "method.request.header.Authorization",
    },
  });

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
  const intrinsicTemplate = getGatewayTemplate({
    hostedZoneId: "HZ789",
    certificateArn: "arn:aws:acm:us-east-1:123:cert/3",
    authorizer: {
      providerARNs: [
        {
          "Fn::GetAtt": ["UserPool", "Arn"],
        },
      ],
    },
  });
  const domainVariantTemplate = getGatewayTemplate({
    hostedZoneId: "HZ999",
    domainName: "api-alt.example.com",
    certificateArn: "arn:aws:acm:us-east-1:123:cert/9",
  });
  const stageVariantTemplate = getGatewayTemplate({
    stageName: "prod",
  });
  const authVariantTemplate = getGatewayTemplate({
    authorizer: {
      providerARNs: ["arn:aws:cognito:us-east-1:123:userpool/2"],
      scopes: ["email"],
      type: "TOKEN",
    },
  });
  const intrinsicResources = intrinsicTemplate.Resources || {};
  const intrinsicAuthorizer =
    intrinsicResources.ApiGatewayCustomAuthorizer as any;
  const defaultDeploymentKey = getDeploymentResourceKey(defaultResources);
  const customDeploymentKey = getDeploymentResourceKey(customResources);
  const domainVariantStage =
    (domainVariantTemplate.Resources || {})
      .ApiGatewayGatewayRESTAPIEnvironment as any;
  const stageVariantStage =
    (stageVariantTemplate.Resources || {})
      .ApiGatewayGatewayRESTAPIEnvironment as any;
  const authVariantStage =
    (authVariantTemplate.Resources || {})
      .ApiGatewayGatewayRESTAPIEnvironment as any;

  return {
    resourceKeyCount: Object.keys(defaultResources).length,
    defaultAuthType: defaultMethod?.Properties?.AuthorizationType,
    defaultStageName: defaultStage?.Properties?.StageName,
    defaultDeploymentId: defaultStage?.Properties?.DeploymentId?.Ref,
    defaultDeploymentKey,
    defaultDeploymentIdMatchesDeploymentKey:
      defaultStage?.Properties?.DeploymentId?.Ref === defaultDeploymentKey,
    defaultIntegrationUri:
      defaultMethod?.Properties?.Integration?.Uri?.["Fn::Sub"],
    defaultRoute53RecordType: defaultRoute53?.Properties?.Type,
    customAuthType: customMethod?.Properties?.AuthorizationType,
    customAuthScopes: customMethod?.Properties?.AuthorizationScopes,
    customAuthorizerRef: customMethod?.Properties?.AuthorizerId?.Ref,
    customAuthorizerIdentitySource:
      customAuthorizer?.Properties?.IdentitySource,
    customAuthorizerProviderARNs: customAuthorizer?.Properties?.ProviderARNs,
    intrinsicAuthorizerProviderARNs:
      intrinsicAuthorizer?.Properties?.ProviderARNs,
    customStageName: customStage?.Properties?.StageName,
    customDeploymentId: customStage?.Properties?.DeploymentId?.Ref,
    customDeploymentKey,
    customDeploymentIdMatchesDeploymentKey:
      customStage?.Properties?.DeploymentId?.Ref === customDeploymentKey,
    deploymentIdStableForDomainConfigChanges:
      defaultStage?.Properties?.DeploymentId?.Ref ===
      domainVariantStage?.Properties?.DeploymentId?.Ref,
    deploymentIdChangesForStageName:
      defaultStage?.Properties?.DeploymentId?.Ref !==
      stageVariantStage?.Properties?.DeploymentId?.Ref,
    deploymentIdChangesForAuthorizerConfig:
      defaultStage?.Properties?.DeploymentId?.Ref !==
      authVariantStage?.Properties?.DeploymentId?.Ref,
  };
};

export const runGatewayPackResourceKeyCountScenario = async () =>
  (await runGatewayPackScenario()).resourceKeyCount;

export const runGatewayPackDefaultAuthTypeScenario = async () =>
  (await runGatewayPackScenario()).defaultAuthType;

export const runGatewayPackDefaultStageNameScenario = async () =>
  (await runGatewayPackScenario()).defaultStageName;

export const runGatewayPackDefaultDeploymentIdScenario = async () =>
  (await runGatewayPackScenario()).defaultDeploymentId;

export const runGatewayPackDefaultDeploymentKeyScenario = async () =>
  (await runGatewayPackScenario()).defaultDeploymentKey;

export const runGatewayPackDefaultDeploymentIdMatchesDeploymentKeyScenario =
  async () =>
    (await runGatewayPackScenario()).defaultDeploymentIdMatchesDeploymentKey;

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

export const runGatewayPackIntrinsicAuthorizerProviderARNsScenario = async () =>
  (await runGatewayPackScenario()).intrinsicAuthorizerProviderARNs;

export const runGatewayPackCustomStageNameScenario = async () =>
  (await runGatewayPackScenario()).customStageName;

export const runGatewayPackCustomDeploymentIdScenario = async () =>
  (await runGatewayPackScenario()).customDeploymentId;

export const runGatewayPackCustomDeploymentKeyScenario = async () =>
  (await runGatewayPackScenario()).customDeploymentKey;

export const runGatewayPackCustomDeploymentIdMatchesDeploymentKeyScenario =
  async () =>
    (await runGatewayPackScenario()).customDeploymentIdMatchesDeploymentKey;

export const runGatewayPackDeploymentIdStableForDomainConfigChangesScenario =
  async () =>
    (await runGatewayPackScenario()).deploymentIdStableForDomainConfigChanges;

export const runGatewayPackDeploymentIdChangesForStageNameScenario = async () =>
  (await runGatewayPackScenario()).deploymentIdChangesForStageName;

export const runGatewayPackDeploymentIdChangesForAuthorizerConfigScenario =
  async () => (await runGatewayPackScenario()).deploymentIdChangesForAuthorizerConfig;
