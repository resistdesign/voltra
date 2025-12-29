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
  const defaultStage = defaultResources.ApiGatewayGatewayRESTAPIEnvironment as any;
  const customStage = customResources.ApiGatewayGatewayRESTAPIEnvironment as any;
  const defaultRoute53 = defaultResources.ApiGatewayRoute53Record as any;
  const customAuthorizer = customResources.ApiGatewayCustomAuthorizer as any;

  return {
    resourceKeys: Object.keys(defaultResources).sort(),
    defaultAuthType: defaultMethod?.Properties?.AuthorizationType,
    defaultStageName: defaultStage?.Properties?.StageName,
    defaultDeploymentId: defaultStage?.Properties?.DeploymentId?.Ref,
    defaultIntegrationUri: defaultMethod?.Properties?.Integration?.Uri?.["Fn::Sub"],
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
