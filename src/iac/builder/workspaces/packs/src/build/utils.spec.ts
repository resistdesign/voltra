import { COMMAND_HELPERS, createBuildSpec } from './utils';

describe('Build Utils', () => {
  describe('createBuildSpec', () => {
    test('should create a YAML build spec', () => {
      const buildSpec = createBuildSpec({
        phases: {
          install: {
            'run-as': 'main-user',
            commands: [COMMAND_HELPERS.addNPMTokenWithNPMRC({ npmToken: 'lkj5thlk5jh345lkj5h54jkth54k2l' })],
          },
          build: {
            'run-as': 'main-user',
            'on-failure': 'ABORT',
            commands: [
              COMMAND_HELPERS.copyDirectoryToS3({ s3Domain: 'example.com', directoryPath: './dist' }),
              COMMAND_HELPERS.updateFunction({
                cloudFunctionArn: 'th5ljk2hl5kj4h325',
                codeZipFilePath: './dist/code.zip',
              }),
            ],
          },
          post_build: {
            'run-as': 'main-user',
            commands: [COMMAND_HELPERS.cloudFrontInvalidation({ cloudFrontDistributionId: 'CFDID' })],
          },
        },
      });

      expect(buildSpec).toMatchSnapshot();
    });
  });
});
