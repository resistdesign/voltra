import { addBuildPipeline } from './build';

describe('Build', () => {
  describe('addBuildPipeline', () => {
    test('should add a build pipeline', () => {
      const cft = addBuildPipeline(
        {
          id: 'APIBuild',
          buildSpec: 'echo "build spec"',
          repoConfig: {
            owner: 'owner',
            repo: 'repo',
            branch: 'main',
            oauthToken: 'oauth-token',
          },
        },
        { AWSTemplateFormatVersion: '2010-09-09' },
      );

      expect(cft).toMatchSnapshot();
    });
  });
});
