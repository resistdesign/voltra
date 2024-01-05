import { addCloudFunction } from './cloud-function';

describe('Cloud Function', () => {
  describe('addCloudFunction', () => {
    test('should add a cloud function and role', () => {
      const cft = addCloudFunction(
        {
          id: 'Basic',
        },
        { AWSTemplateFormatVersion: '2010-09-09' }
      );

      expect(cft).toMatchSnapshot();
    });
  });
});
