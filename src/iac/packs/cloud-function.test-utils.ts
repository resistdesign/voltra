import { SimpleCFT } from "../SimpleCFT";
import { addCloudFunction, PLACEHOLDER_FUNCTION_CODE } from "./cloud-function";

export const runCloudFunctionPackScenario = () => {
  const defaultTemplate = new SimpleCFT()
    .applyPack(addCloudFunction, {
      id: "AppFunction",
    })
    .toJSON();

  const customTemplate = new SimpleCFT()
    .applyPack(addCloudFunction, {
      id: "CustomFunction",
      handler: "main.handler",
      runtime: "nodejs20.x",
      timeout: 10,
      environment: {
        Variables: {
          NODE_ENV: "test",
        },
      },
      policies: [
        {
          PolicyName: "custom-policy",
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["logs:CreateLogGroup"],
                Resource: "*",
              },
            ],
          },
        },
      ],
    })
    .toJSON();

  const defaultResources = defaultTemplate.Resources || {};
  const defaultFunction = defaultResources.AppFunction as any;
  const defaultRole = defaultResources.AppFunctionRole as any;

  const customResources = customTemplate.Resources || {};
  const customFunction = customResources.CustomFunction as any;
  const customRole = customResources.CustomFunctionRole as any;

  return {
    defaultRuntime: defaultFunction?.Properties?.Runtime,
    defaultHandler: defaultFunction?.Properties?.Handler,
    defaultTimeout: defaultFunction?.Properties?.Timeout,
    defaultCode: defaultFunction?.Properties?.Code,
    defaultEnv: defaultFunction?.Properties?.Environment,
    defaultPolicies: defaultRole?.Properties?.Policies,
    placeholderCode: PLACEHOLDER_FUNCTION_CODE,
    customRuntime: customFunction?.Properties?.Runtime,
    customHandler: customFunction?.Properties?.Handler,
    customTimeout: customFunction?.Properties?.Timeout,
    customEnv: customFunction?.Properties?.Environment,
    customPolicies: customRole?.Properties?.Policies,
  };
};

export const runCloudFunctionPackDefaultRuntimeScenario = async () =>
  (await runCloudFunctionPackScenario()).defaultRuntime;

export const runCloudFunctionPackDefaultHandlerScenario = async () =>
  (await runCloudFunctionPackScenario()).defaultHandler;

export const runCloudFunctionPackDefaultTimeoutScenario = async () =>
  (await runCloudFunctionPackScenario()).defaultTimeout;

export const runCloudFunctionPackDefaultCodeScenario = async () =>
  (await runCloudFunctionPackScenario()).defaultCode;

export const runCloudFunctionPackDefaultEnvScenario = async () =>
  (await runCloudFunctionPackScenario()).defaultEnv;

export const runCloudFunctionPackDefaultPoliciesScenario = async () =>
  (await runCloudFunctionPackScenario()).defaultPolicies;

export const runCloudFunctionPackPlaceholderCodeScenario = async () =>
  (await runCloudFunctionPackScenario()).placeholderCode;

export const runCloudFunctionPackCustomRuntimeScenario = async () =>
  (await runCloudFunctionPackScenario()).customRuntime;

export const runCloudFunctionPackCustomHandlerScenario = async () =>
  (await runCloudFunctionPackScenario()).customHandler;

export const runCloudFunctionPackCustomTimeoutScenario = async () =>
  (await runCloudFunctionPackScenario()).customTimeout;

export const runCloudFunctionPackCustomEnvScenario = async () =>
  (await runCloudFunctionPackScenario()).customEnv;

export const runCloudFunctionPackCustomPoliciesScenario = async () =>
  (await runCloudFunctionPackScenario()).customPolicies;
