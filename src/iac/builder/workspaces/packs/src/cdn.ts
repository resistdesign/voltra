import { createResourcePack } from '@aws-cf-builder/utils';

export type AddCDNConfig = {
  id: string;
  hostedZoneId: any;
  domainName: any;
  certificateArn: any;
  fileStorageId: string;
};

export const addCDN = createResourcePack(({ id, hostedZoneId, domainName, certificateArn, fileStorageId }: AddCDNConfig) => {
  return {
    Resources: {
      [`${id}CloudFront`]: {
        Type: 'AWS::CloudFront::Distribution',
        DependsOn: fileStorageId,
        Properties: {
          DistributionConfig: {
            Aliases: [domainName],
            ViewerCertificate: {
              AcmCertificateArn: certificateArn,
              SslSupportMethod: 'sni-only',
              MinimumProtocolVersion: 'TLSv1.1_2016',
            },
            DefaultCacheBehavior: {
              ForwardedValues: {
                QueryString: false,
              },
              TargetOriginId: {
                'Fn::Sub': [
                  'S3-${S3BucketName}',
                  {
                    S3BucketName: domainName,
                  },
                ],
              },
              ViewerProtocolPolicy: 'redirect-to-https',
            },
            DefaultRootObject: 'index.html',
            Enabled: true,
            IPV6Enabled: false,
            HttpVersion: 'http2',
            Origins: [
              {
                DomainName: {
                  'Fn::Sub': [
                    '${S3BucketName}.s3.amazonaws.com',
                    {
                      S3BucketName: domainName,
                    },
                  ],
                },
                Id: {
                  'Fn::Sub': [
                    'S3-${S3BucketName}',
                    {
                      S3BucketName: domainName,
                    },
                  ],
                },
                S3OriginConfig: {
                  OriginAccessIdentity: '',
                },
              },
            ],
            CustomErrorResponses: [
              {
                ErrorCachingMinTTL: 300,
                ErrorCode: 404,
                ResponseCode: 200,
                ResponsePagePath: '/index.html',
              },
              {
                ErrorCachingMinTTL: 300,
                ErrorCode: 403,
                ResponseCode: 200,
                ResponsePagePath: '/index.html',
              },
            ],
            PriceClass: 'PriceClass_All',
          },
        },
      },
      [`${id}Route53Record`]: {
        Type: 'AWS::Route53::RecordSet',
        DependsOn: [`${id}CloudFront`],
        Properties: {
          HostedZoneId: hostedZoneId,
          Type: 'A',
          Name: {
            'Fn::Sub': [
              '${DomainName}.',
              {
                DomainName: domainName,
              },
            ],
          },
          AliasTarget: {
            HostedZoneId: 'Z2FDTNDATAQYW2',
            DNSName: {
              'Fn::Sub': [
                '${DomainName}.',
                {
                  DomainName: {
                    'Fn::GetAtt': [`${id}CloudFront`, 'DomainName'],
                  },
                },
              ],
            },
          },
        },
      },
    },
  };
});
