import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";
import { CloudFormationPrimitiveValue } from "../types/IaCTypes";

export type AddDNSConfig = {
  hostedZoneId: CloudFormationPrimitiveValue<string>;
  domainName: CloudFormationPrimitiveValue<string>;
  localUIDevelopmentDomainName?: string;
  localUIDevelopmentIPAddress?: string;
};

/**
 * Add DNS parameters for reference in other resources.
 * Optionally includes a front-end live development subdomain.
 * */
export const addDNS = createResourcePack(
  ({
    hostedZoneId,
    domainName,
    localUIDevelopmentDomainName,
    localUIDevelopmentIPAddress,
  }: AddDNSConfig) => {
    let cft = new SimpleCFT();

    if (localUIDevelopmentDomainName) {
      cft = cft.patch({
        Resources: {
          [localUIDevelopmentDomainName]: {
            Type: "AWS::Route53::RecordSet",
            DeletionPolicy: "Delete",
            Properties: {
              HostedZoneId: hostedZoneId,
              Type: "A",
              Name: {
                "Fn::Sub": [
                  "app-local.${BaseDomainName}",
                  {
                    BaseDomainName: domainName,
                  },
                ],
              },
              ResourceRecords: [
                localUIDevelopmentIPAddress
                  ? localUIDevelopmentIPAddress
                  : "127.0.0.1",
              ],
              TTL: "300",
            },
          },
        },
      });
    }

    return cft.template;
  },
);
