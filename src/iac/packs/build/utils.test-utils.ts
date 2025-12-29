import { COMMAND_HELPERS, createBuildSpec } from "./utils";

export const runBuildUtilsScenario = () => {
  const updateCmd = COMMAND_HELPERS.updateFunction({
    cloudFunctionArn: "arn:aws:lambda:us-east-1:123:function:demo",
    codeZipFilePath: "dist/code.zip",
  });
  const copyCmd = COMMAND_HELPERS.copyDirectoryToS3({
    s3Domain: "my-bucket",
    directoryPath: "dist",
  });
  const invalidateCmd = COMMAND_HELPERS.cloudFrontInvalidation({
    cloudFrontDistributionId: "DIST123",
    pathsToInvalidate: ["/", "/assets/*"],
  });
  const npmCmd = COMMAND_HELPERS.addNPMTokenWithNPMRC({
    npmToken: "token-123",
  });

  const buildSpec = createBuildSpec({
    phases: {
      install: {
        commands: ["npm ci"],
      },
      build: {
        commands: ["npm run build"],
      },
    },
  });

  return {
    updateCmd,
    copyCmd,
    invalidateCmd,
    npmCmd,
    buildSpec,
  };
};
