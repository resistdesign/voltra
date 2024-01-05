import { addGateway } from './gateway';

describe('Gateway', () => {
  describe('addGateway', () => {
    test('should add a gateway for an API', () => {
      const cft = addGateway(
        {
          id: 'Basic',
          hostedZoneId: '1234567890',
          domainName: 'api.example.com',
          certificateArn: 'i:am:a:cert:arn',
          stageName: 'production',
          cloudFunction: {
            id: 'CFID',
            region: 'us-east-1',
          },
          authorizer: {
            providerARNs: ['PROVIDER_ARN'],
          },
        },
        { AWSTemplateFormatVersion: '2010-09-09' }
      );

      expect(cft).toMatchSnapshot();
    });
  });
});
