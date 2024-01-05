import { addCDN } from './cdn';

describe('CDN', () => {
  describe('addCDN', () => {
    test('should add a CDN', () => {
      const cft = addCDN(
        {
          id: 'Basic',
          hostedZoneId: '1234567890',
          domainName: 'app.example.com',
          fileStorageId: 'BasicS3',
          certificateArn: 'i:am:a:cert:arn',
        },
        { AWSTemplateFormatVersion: '2010-09-09' }
      );

      expect(cft).toMatchSnapshot();
    });
  });
});
