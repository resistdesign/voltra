import { addSecureFileStorage } from './file-storage';

describe('File Storage', () => {
  describe('addSecureFileStorage', () => {
    test('should add secure file storage', () => {
      const cft = addSecureFileStorage(
        {
          id: 'APIFS',
          bucketName: true,
          cors: true,
          blockPublicAccess: true,
          shouldDelete: true,
        },
        { AWSTemplateFormatVersion: '2010-09-09' }
      );

      expect(cft).toMatchSnapshot();
    });
  });
});
