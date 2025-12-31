/**
 * @packageDocumentation
 *
 * Lambda pack that provisions a basic function with an IAM role and optional
 * environment settings.
 */
import { AWS } from "../types/IaCTypes";
import { createResourcePack } from "../utils";

/**
 * Default inline function code for placeholder Lambda resources.
 */
export const PLACEHOLDER_FUNCTION_CODE: AWS.Lambda.Function.Code = {
  ZipFile:
    "module.exports = {handler: async () => ({\n            statusCode: 200,\n            headers: {'Content-Type': 'application/json'},\n            body: '\"You did it!\"'\n          })};\n",
};

/**
 * Supported Lambda runtimes for cloud functions.
 */
export type CloudFunctionRuntime =
  // Node.js
  | "nodejs14.x"
  | "nodejs16.x"
  | "nodejs18.x"
  | "nodejs20.x"
  | "nodejs22.x"
  | "nodejs24.x"
  | "nodejs26.x"

  // Python
  | "python3.8"
  | "python3.9"
  | "python3.10"
  | "python3.11"
  | "python3.12"
  | "python3.13"
  | "python3.14"
  | "python3.15"

  // Java
  | "java11"
  | "java17"
  | "java21"
  | "java25"

  // .NET
  | "dotnet6"
  | "dotnet8"
  | "dotnet10"

  // Go
  | "go1.x"

  // Ruby
  | "ruby2.7"
  | "ruby3.2"
  | "ruby3.3"
  | "ruby3.4"
  | "ruby3.5"

  // Custom runtimes
  | "provided"
  | "provided.al2"
  | "provided.al2023";

/**
 * Configuration for the cloud function pack.
 */
export type AddCloudFunctionConfig = {
  /**
   * Base id for the function resources.
   */
  id: string;
  /**
   * Lambda function code.
   */
  code?: AWS.Lambda.Function.Code;
  /**
   * Lambda environment configuration.
   */
  environment?: AWS.Lambda.Function.Environment;
  /**
   * Function handler entrypoint.
   */
  handler?: any;
  /**
   * Lambda runtime.
   */
  runtime?: CloudFunctionRuntime;
  /**
   * Function timeout in seconds.
   */
  timeout?: any;
  /**
   * IAM policy statements to attach to the role.
   */
  policies?: AWS.IAM.Role.Policy[];
  /**
   * Lambda function memory size in MB.
   *
   * You can configure memory between 128 MB and 10,240 MB in 1-MB increments.
   *
   * @default 128
   */
  memorySize?: number;
};

/**
 * Add a serverless cloud function to run part or all of your API (back-end) without always running servers.
 *
 * @param config - Cloud function configuration.
 * */
/**
 * Add a cloud function resource with IAM role and configuration.
 */
export const addCloudFunction = createResourcePack(
  ({
    id,
    code = PLACEHOLDER_FUNCTION_CODE,
    environment = {
      Variables: {
        NODE_ENV: "production",
      },
    },
    handler = "index.handler",
    runtime = "nodejs26.x",
    timeout = 30,
    policies = [
      {
        PolicyName: "lambda-parameter-store",
        PolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["*"],
              Resource: "*",
            },
          ],
        },
      },
    ],
    memorySize = 128,
  }: AddCloudFunctionConfig) => {
    return {
      Resources: {
        [`${id}Role`]: {
          Type: "AWS::IAM::Role",
          Properties: {
            ManagedPolicyArns: [
              "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            ],
            AssumeRolePolicyDocument: {
              Version: "2012-10-17",
              Statement: [
                {
                  Action: ["sts:AssumeRole"],
                  Effect: "Allow",
                  Principal: {
                    Service: ["lambda.amazonaws.com"],
                  },
                },
              ],
            },
            Policies: policies,
          },
        },
        [id]: {
          Type: "AWS::Lambda::Function",
          Properties: {
            Timeout: timeout,
            Code: code,
            Environment: environment,
            Handler: handler,
            Role: {
              "Fn::GetAtt": [`${id}Role`, "Arn"],
            },
            Runtime: runtime,
            MemorySize: memorySize,
          },
        },
      },
    };
  },
);
