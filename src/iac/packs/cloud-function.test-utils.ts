import { SimpleCFT } from "../SimpleCFT";
import {
  addCloudFunction,
  PLACEHOLDER_FUNCTION_CODE,
} from "./cloud-function";

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
