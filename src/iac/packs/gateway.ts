/**
 * @packageDocumentation
 *
 * API Gateway pack that connects a Lambda function, optional Cognito authorizer,
 * and DNS domain mapping.
 */
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";
import { CloudFormationPrimitiveValue } from "../types/IaCTypes";

/**
 * Default API Gateway authorization type.
 */
export const DEFAULT_AUTH_TYPE = "COGNITO_USER_POOLS";

/**
 * Configuration for API Gateway authorizers.
 */
export type AddGatewayAuthorizerConfig = {
  /**
   * Cognito provider ARNs for authorization.
   */
  providerARNs?: string[];
  /**
   * Authorization scopes to require.
   */
  scopes?: string[];
  /**
   * Authorizer type to use.
   */
  type?: "TOKEN" | "COGNITO_USER_POOLS" | "REQUEST";
  /**
   * Identity source expression for authorization.
   */
  identitySource?: string;
};

/**
 * Configuration for the API Gateway pack.
 */
export type AddGatewayConfig = {
  /**
   * Base id for gateway resources.
   */
  id: string;
  /**
   * Hosted zone id for the API domain.
   */
  hostedZoneId: any;
  /**
   * Domain name for the API.
   */
  domainName: any;
  /**
   * ACM certificate ARN for the API domain.
   */
  certificateArn: CloudFormationPrimitiveValue<string>;
  /**
   * Target Lambda function information.
   */
  cloudFunction: { id: string; region?: string };
  /**
   * Stage name to deploy.
   */
  stageName?: any;
  /**
   * Authorizer config or boolean to enable/disable.
   */
  authorizer?: AddGatewayAuthorizerConfig | boolean;
  /**
   * Suffix to ensure unique deployment ids.
   */
  deploymentSuffix?: string;
};

/**
 * Add a load-balanced API gateway for your serverless cloud function.
 * Includes authorization config that connects your user management system to your cloud function.
 * Also includes a DNS record for your API/back-end.
 *
 * @param config - Gateway configuration.
 * */
/**
 * Add API Gateway resources with optional authorizer and DNS.
 */
export const addGateway = createResourcePack(
  ({
    id,
    hostedZoneId,
    domainName,
    certificateArn,
    cloudFunction: {
      id: cloudFunctionId,
      region: cloudFunctionRegion = "${AWS::Region}",
    },
    stageName = "production",
    authorizer,
    deploymentSuffix = "",
  }: AddGatewayConfig) => {
    const cloudFunctionUri = {
      "Fn::Sub": `arn:aws:apigateway:${cloudFunctionRegion}:lambda:path/2015-03-31/functions/\${${cloudFunctionId}.Arn}/invocations`,
    };
    const {
      scopes: authScopes = ["phone", "email", "openid", "profile"],
      type: authType = "COGNITO_USER_POOLS",
      providerARNs,
      identitySource = "method.request.header.authorization",
    }: Partial<AddGatewayAuthorizerConfig> = !!authorizer &&
    typeof authorizer === "object"
      ? authorizer
      : {};
    const authorizerId = `${id}CustomAuthorizer`;
    const authProps = !!authorizer
      ? {
          AuthorizationScopes: authScopes,
          AuthorizationType:
            authType === DEFAULT_AUTH_TYPE ? DEFAULT_AUTH_TYPE : "CUSTOM",
          AuthorizerId: {
            Ref: authorizerId,
          },
        }
      : {
          AuthorizationType: "NONE",
        };
    const fullDeploymentId = `${id}GatewayRESTAPIDeployment${deploymentSuffix}`;

    return new SimpleCFT()
      .patch({
        Resources: {
          // REST API
          [id]: {
            Type: "AWS::ApiGateway::RestApi",

            Properties: {
              Name: {
                "Fn::Sub": `\${AWS::StackName}-${id}GatewayRESTAPI`,
              },
              EndpointConfiguration: {
                Types: ["EDGE"],
              },
            },
          },
          [`${id}GatewayRESTAPIResource`]: {
            Type: "AWS::ApiGateway::Resource",
            DependsOn: id,
            Properties: {
              ParentId: {
                "Fn::GetAtt": [id, "RootResourceId"],
              },
              PathPart: "{proxy+}",
              RestApiId: {
                Ref: id,
              },
            },
          },
          [`${id}GatewayRESTAPIMethod`]: {
            Type: "AWS::ApiGateway::Method",
            DependsOn: `${id}GatewayRESTAPIResource`,
            Properties: {
              ...authProps,
              HttpMethod: "ANY",
              ResourceId: {
                Ref: `${id}GatewayRESTAPIResource`,
              },
              RestApiId: {
                Ref: id,
              },
              Integration: {
                Type: "AWS_PROXY",
                IntegrationHttpMethod: "POST",
                Uri: cloudFunctionUri,
              },
            },
          },
          [`${id}GatewayRESTAPIRootMethod`]: {
            Type: "AWS::ApiGateway::Method",
            DependsOn: `${id}GatewayRESTAPIResource`,
            Properties: {
              ...authProps,
              HttpMethod: "ANY",
              ResourceId: {
                "Fn::GetAtt": [id, "RootResourceId"],
              },
              RestApiId: {
                Ref: id,
              },
              Integration: {
                Type: "AWS_PROXY",
                IntegrationHttpMethod: "POST",
                Uri: cloudFunctionUri,
              },
            },
          },
        },
      })
      .patch({
        Resources: {
          // CORS
          [`${id}GatewayRESTAPIOPTIONSMethod`]: {
            Type: "AWS::ApiGateway::Method",
            DependsOn: `${id}GatewayRESTAPIResource`,
            Properties: {
              AuthorizationType: "NONE",
              HttpMethod: "OPTIONS",
              ResourceId: {
                Ref: `${id}GatewayRESTAPIResource`,
              },
              RestApiId: {
                Ref: id,
              },
              Integration: {
                Type: "AWS_PROXY",
                IntegrationHttpMethod: "POST",
                Uri: cloudFunctionUri,
              },
            },
          },
          [`${id}GatewayRESTAPIRootOPTIONSMethod`]: {
            Type: "AWS::ApiGateway::Method",
            DependsOn: `${id}GatewayRESTAPIResource`,
            Properties: {
              AuthorizationType: "NONE",
              HttpMethod: "OPTIONS",
              ResourceId: {
                "Fn::GetAtt": [id, "RootResourceId"],
              },
              RestApiId: {
                Ref: id,
              },
              Integration: {
                Type: "AWS_PROXY",
                IntegrationHttpMethod: "POST",
                Uri: cloudFunctionUri,
              },
            },
          },
          [`${id}GatewayResponseDefault4XX`]: {
            Type: "AWS::ApiGateway::GatewayResponse",
            Properties: {
              ResponseParameters: {
                // Not authorized, so just allow the current origin by mapping it into the header.
                "gatewayresponse.header.Access-Control-Allow-Origin":
                  "method.request.header.origin",
                "gatewayresponse.header.Access-Control-Allow-Credentials":
                  "'true'",
                "gatewayresponse.header.Access-Control-Allow-Headers": "'*'",
              },
              ResponseType: "DEFAULT_4XX",
              RestApiId: {
                Ref: id,
              },
            },
          },
        },
      })
      .patch({
        Resources: {
          // SUPPORTING RESOURCES
          [fullDeploymentId]: {
            Type: "AWS::ApiGateway::Deployment",
            DependsOn: [
              `${id}GatewayRESTAPIResource`,
              `${id}GatewayRESTAPIMethod`,
              `${id}GatewayRESTAPIRootMethod`,
              id,
              cloudFunctionId,
            ],
            Properties: {
              RestApiId: {
                Ref: id,
              },
            },
          },
          [`${id}CloudWatch`]: {
            Type: "AWS::Logs::LogGroup",
            Properties: {
              LogGroupName: {
                "Fn::Sub": `\${AWS::StackName}-${id}GatewayLogs`,
              },
            },
          },
          [`${id}CloudWatchRole`]: {
            Type: "AWS::IAM::Role",
            Properties: {
              AssumeRolePolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Principal: {
                      Service: ["apigateway.amazonaws.com"],
                    },
                    Action: "sts:AssumeRole",
                  },
                ],
              },
              Path: "/",
              ManagedPolicyArns: [
                "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs",
              ],
            },
          },
          [`${id}CloudWatchAccount`]: {
            Type: "AWS::ApiGateway::Account",
            Properties: {
              CloudWatchRoleArn: {
                "Fn::GetAtt": [`${id}CloudWatchRole`, "Arn"],
              },
            },
          },
          [`${id}GatewayRESTAPIEnvironment`]: {
            Type: "AWS::ApiGateway::Stage",
            DependsOn: [`${id}CloudWatchAccount`, fullDeploymentId],
            Properties: {
              AccessLogSetting: {
                DestinationArn: {
                  "Fn::GetAtt": [`${id}CloudWatch`, "Arn"],
                },
                Format:
                  '{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","apiGatewayErrorMessage":"$context.error.message"}',
              },
              DeploymentId: {
                Ref: fullDeploymentId,
              },
              RestApiId: {
                Ref: id,
              },
              StageName: stageName,
            },
          },
        },
      })
      .patch({
        Resources: {
          // DNS
          [`${id}DomainName`]: {
            Type: "AWS::ApiGateway::DomainName",
            Properties: {
              CertificateArn: certificateArn,
              DomainName: domainName,
              EndpointConfiguration: {
                Types: ["EDGE"],
              },
            },
          },
          [`${id}DomainNameBasePathMapping`]: {
            Type: "AWS::ApiGateway::BasePathMapping",
            DependsOn: [
              id,
              `${id}GatewayRESTAPIEnvironment`,
              `${id}DomainName`,
            ],
            Properties: {
              DomainName: domainName,
              RestApiId: {
                Ref: id,
              },
              Stage: stageName,
            },
          },
          [`${id}Route53Record`]: {
            Type: "AWS::Route53::RecordSet",
            DependsOn: `${id}DomainName`,
            Properties: {
              HostedZoneId: hostedZoneId,
              Type: "A",
              Name: {
                "Fn::Sub": [
                  "${DomainName}.",
                  {
                    DomainName: domainName,
                  },
                ],
              },
              AliasTarget: {
                HostedZoneId: "Z2FDTNDATAQYW2",
                DNSName: {
                  "Fn::Sub": [
                    "${DomainName}.",
                    {
                      DomainName: {
                        "Fn::GetAtt": [
                          `${id}DomainName`,
                          "DistributionDomainName",
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      })
      .patch({
        Resources: {
          // PERMISSIONS
          [`${id}CloudFunctionANYResourcePermission`]: {
            Type: "AWS::Lambda::Permission",
            Properties: {
              Action: "lambda:InvokeFunction",
              Principal: "apigateway.amazonaws.com",
              FunctionName: {
                "Fn::GetAtt": [cloudFunctionId, "Arn"],
              },
              SourceArn: {
                "Fn::Sub": [
                  "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${__ApiId__}/${__Stage__}/*/*",
                  {
                    __Stage__: stageName,
                    __ApiId__: {
                      Ref: id,
                    },
                  },
                ],
              },
            },
          },
        },
      })
      .patch(
        !!authorizer
          ? {
              Resources: {
                // AUTHORIZER
                [`${id}CustomAuthorizer`]: {
                  Type: "AWS::ApiGateway::Authorizer",
                  Properties: {
                    IdentitySource: identitySource,
                    Name: `${id}CustomAuthorizer`,
                    ProviderARNs: providerARNs,
                    RestApiId: {
                      Ref: id,
                    },
                    Type: "COGNITO_USER_POOLS",
                  },
                },
              },
            }
          : {},
      ).template;
  },
);
