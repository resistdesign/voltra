/**
 * @packageDocumentation
 *
 * CloudFront CDN pack with an S3 origin and Route53 alias record.
 */
import { createResourcePack } from "../utils";

export type AddCDNConfig = {
  /**
   * CloudFront distribution id.
   */
  id: string;
  /**
   * Route53 hosted zone id for the domain.
   */
  hostedZoneId: any;
  /**
   * Domain name to serve.
   */
  domainName: any;
  /**
   * ACM certificate ARN for the domain.
   */
  certificateArn: any;
  /**
   * S3 file storage resource id.
   */
  fileStorageId: string;
};

/**
 * Add a global cache of static files (a CDN) for things like your front-end, website, etc.
 * Includes a DNS record for the domain.
 *
 * @param config - CDN configuration.
 * */
export const addCDN = createResourcePack(
  ({
    id,
    hostedZoneId,
    domainName,
    certificateArn,
    fileStorageId,
  }: AddCDNConfig) => {
    const oacId = `${id}OriginAccessControl`;

    return {
      Resources: {
        [oacId]: {
          Type: "AWS::CloudFront::OriginAccessControl",
          Properties: {
            OriginAccessControlConfig: {
              Name: oacId,
              OriginAccessControlOriginType: "s3",
              SigningBehavior: "always",
              SigningProtocol: "sigv4",
            },
          },
        },
        [id]: {
          Type: "AWS::CloudFront::Distribution",
          DependsOn: fileStorageId,
          Properties: {
            DistributionConfig: {
              Aliases: [domainName],
              ViewerCertificate: {
                AcmCertificateArn: certificateArn,
                SslSupportMethod: "sni-only",
                MinimumProtocolVersion: "TLSv1.1_2016",
              },
              DefaultCacheBehavior: {
                ForwardedValues: {
                  QueryString: false,
                },
                TargetOriginId: {
                  "Fn::Sub": [
                    "S3-${S3BucketName}",
                    {
                      S3BucketName: domainName,
                    },
                  ],
                },
                ViewerProtocolPolicy: "redirect-to-https",
              },
              DefaultRootObject: "index.html",
              Enabled: true,
              IPV6Enabled: false,
              HttpVersion: "http2",
              Origins: [
                {
                  DomainName: {
                    "Fn::Sub": [
                      "${S3BucketName}.s3.amazonaws.com",
                      {
                        S3BucketName: domainName,
                      },
                    ],
                  },
                  Id: {
                    "Fn::Sub": [
                      "S3-${S3BucketName}",
                      {
                        S3BucketName: domainName,
                      },
                    ],
                  },
                  OriginAccessControlId: { Ref: oacId },
                  S3OriginConfig: {
                    OriginAccessIdentity: "",
                  },
                },
              ],
              CustomErrorResponses: [
                {
                  ErrorCachingMinTTL: 300,
                  ErrorCode: 404,
                  ResponseCode: 200,
                  ResponsePagePath: "/index.html",
                },
                {
                  ErrorCachingMinTTL: 300,
                  ErrorCode: 403,
                  ResponseCode: 200,
                  ResponsePagePath: "/index.html",
                },
              ],
              PriceClass: "PriceClass_All",
            },
          },
        },
        [`${id}Route53Record`]: {
          Type: "AWS::Route53::RecordSet",
          DependsOn: [id],
          Properties: {
            HostedZoneId: hostedZoneId,
            Type: "A",
            Name: {
              "Fn::Sub": [
                "${DomainName}.",
                {
                  DomainName: domainName,
                },
              ],
            },
            AliasTarget: {
              HostedZoneId: "Z2FDTNDATAQYW2",
              DNSName: {
                "Fn::Sub": [
                  "${DomainName}.",
                  {
                    DomainName: {
                      "Fn::GetAtt": [id, "DomainName"],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };
  },
);
