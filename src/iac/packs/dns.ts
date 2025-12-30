/**
 * @packageDocumentation
 *
 * Route53 DNS record pack for simple A/other record creation.
 */
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";
import { CloudFormationPrimitiveValue } from "../types/IaCTypes";

/**
 * Configuration for the DNS record pack.
 */
export type AddDNSConfig = {
  /**
   * Resource id for the DNS record.
   */
  id: string;
  /**
   * Hosted zone id for the domain.
   */
  hostedZoneId: CloudFormationPrimitiveValue<string>;
  /**
   * Fully qualified domain name.
   */
  domainName: CloudFormationPrimitiveValue<string>;
  /**
   * Resource records for the DNS entry.
   */
  resourceRecords: CloudFormationPrimitiveValue<string>[];
  /**
   * DNS record type.
   */
  recordType?: CloudFormationPrimitiveValue<string>;
};

/**
 * Add DNS parameters for reference in other resources.
 * Optionally includes a front-end live development subdomain.
 *
 * @param config - DNS configuration.
 * */
export const addDNS = createResourcePack(
  ({
    id,
    hostedZoneId,
    domainName,
    resourceRecords,
    recordType = "A",
  }: AddDNSConfig) => {
    let cft = new SimpleCFT().patch({
      Resources: {
        [id]: {
          Type: "AWS::Route53::RecordSet",
          Properties: {
            HostedZoneId: hostedZoneId,
            Type: recordType,
            Name: domainName,
            ResourceRecords: resourceRecords,
            TTL: "300",
          },
        },
      },
    });

    return cft.template;
  },
);
