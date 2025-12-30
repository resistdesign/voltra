/**
 * @packageDocumentation
 *
 * Route53 DNS record pack for simple A/other record creation.
 */
import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";
import { CloudFormationPrimitiveValue } from "../types/IaCTypes";

export type AddDNSConfig = {
  id: string;
  hostedZoneId: CloudFormationPrimitiveValue<string>;
  domainName: CloudFormationPrimitiveValue<string>;
  resourceRecords: CloudFormationPrimitiveValue<string>[];
  recordType?: CloudFormationPrimitiveValue<string>;
};

/**
 * Add DNS parameters for reference in other resources.
 * Optionally includes a front-end live development subdomain.
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
