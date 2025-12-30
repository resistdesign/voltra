import { SimpleCFT } from "../SimpleCFT";
import { addCDN } from "./cdn";

export const runCDNPackScenario = () => {
  const template = new SimpleCFT()
    .applyPack(addCDN, {
      id: "SiteCDN",
      hostedZoneId: "HZ123",
      domainName: "example.com",
      certificateArn: "arn:aws:acm:us-east-1:123:cert/1",
      fileStorageId: "BucketResource",
    })
    .toJSON();

  const resources = template.Resources || {};
  const oac = resources.SiteCDNOriginAccessControl as any;
  const distribution = resources.SiteCDN as any;
  const route53 = resources.SiteCDNRoute53Record as any;

  return {
    resourceKeys: Object.keys(resources).sort(),
    oacName: oac?.Properties?.OriginAccessControlConfig?.Name,
    distributionDependsOn: distribution?.DependsOn,
    viewerCertificateArn:
      distribution?.Properties?.DistributionConfig?.ViewerCertificate
        ?.AcmCertificateArn,
    defaultRootObject:
      distribution?.Properties?.DistributionConfig?.DefaultRootObject,
    route53HostedZoneId: route53?.Properties?.HostedZoneId,
    route53DependsOn: route53?.DependsOn,
  };
};
