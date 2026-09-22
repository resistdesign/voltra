import { AWS } from "./AWS";

const COGNITO_CONFIG: AWS.CognitoAuthInfoConfig = {
  userPoolId: "us-east-1_TESTPOOL",
  clientId: "test-client",
  tokenUse: "access",
};

const getEvent = (authorization?: string): AWS.IAWSCloudFunctionEvent => ({
  headers: authorization
    ? {
        Authorization: authorization,
      }
    : {},
});

export const runCognitoAuthInfoMissingTokenScenario = async () =>
  AWS.getCognitoAuthInfo(getEvent(), COGNITO_CONFIG);

export const runCognitoAuthInfoNonBearerTokenScenario = async () =>
  AWS.getCognitoAuthInfo(getEvent("Basic abc123"), COGNITO_CONFIG);

export const runCognitoAuthInfoMalformedTokenScenario = async () =>
  AWS.getCognitoAuthInfo(getEvent("Bearer not-a-jwt"), COGNITO_CONFIG);
