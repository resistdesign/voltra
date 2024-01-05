import { createResourcePack, SimpleCFT } from '@aws-cf-builder/utils';
import { addCDN, addCloudFunction, addGateway, addSecureFileStorage } from '@aws-cf-builder/packs';

const EXAMPLE_CERT_ARN = 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012';

const addBasicOutput = createResourcePack(({ info = '' }: { info: string }) => ({
  Outputs: {
    Info: {
      Description: 'Basic information.',
      Export: {
        Name: 'Info',
      },
      Value: info,
    },
  },
}));

export default addBasicOutput(
  { info: 'This stack was created with AWS CF Builder.' },
  new SimpleCFT()
    .patch({
      Description: 'And example CloudFormation template.',
    })
    .addParameterGroup({
      Label: 'UI Parameters',
      Parameters: {
        UIDomainName: {
          Label: 'UI Domain Name',
          Type: 'String',
          Description: 'The domain name for the user interface.',
          Default: 'app.example.com',
        },
      },
    })
    .addParameterGroup({
      Label: 'API Parameters',
      Parameters: {
        APIDomainName: {
          Label: 'API Domain Name',
          Type: 'String',
          Description: 'The domain name for the API.',
          Default: 'api.example.com',
        },
      },
    })
    .addParameterGroup({
      Label: 'API Parameters',
      Parameters: {
        APIType: {
          Label: 'API Type',
          Type: 'String',
          Description: 'The type of API to deploy.',
          Default: 'lambda',
        },
      },
    })
    .patch(
      new SimpleCFT().addParameterGroup({
        Label: 'API Parameters',
        Parameters: {
          APIPatchedParam1: {
            Label: 'API Patched Param 1',
            Type: 'String',
          },
          APIPatchedParam2: {
            Label: 'API Patched Param 2',
            Type: 'String',
          },
        },
      }).template
    )
    .applyPack(
      {
        id: 'UIStaticFiles',
        cors: true,
      },
      addSecureFileStorage
    )
    .applyPack(
      {
        id: 'UICDN',
        certificateArn: EXAMPLE_CERT_ARN,
        domainName: {
          Ref: 'UIDomainName',
        },
        fileStorageId: 'UIStaticFiles',
        hostedZoneId: '<example.com-hosted-zone-id>',
      },
      addCDN
    )
    .applyPack(
      {
        id: 'APICF',
      },
      addCloudFunction
    )
    .applyPack(
      {
        id: 'APIGW',
        hostedZoneId: 'THE_ZONE',
        cloudFunction: {
          id: 'APICF',
        },
        domainName: 'api.example.com',
        certificateArn: EXAMPLE_CERT_ARN,
      },
      addGateway
    ).template
);
