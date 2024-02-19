import { createResourcePack } from "../utils";
import { SimpleCFT } from "../SimpleCFT";

export type AddDNSConfig = {
  hostedZoneIdParameterName: string;
  domainNameParameterName: string;
  localUIDevelopmentDomainName?: string;
  localUIDevelopmentIPAddress?: string;
};

/**
 * Add DNS parameters for reference in other resources.
 * Optionally includes a front-end live development subdomain.
 * */
export const addDNS = createResourcePack(
  ({
    hostedZoneIdParameterName,
    domainNameParameterName,
    localUIDevelopmentDomainName,
    localUIDevelopmentIPAddress,
  }: AddDNSConfig) => {
    let cft = new SimpleCFT().addParameterGroup({
      Label: "DNS",
      Parameters: {
        [hostedZoneIdParameterName]: {
          Label: "Hosted Zone ID",
          Type: "AWS::Route53::HostedZone::Id",
          Description: "Hosted Zone ID",
        },
        [domainNameParameterName]: {
          Label: "Domain Name",
          Type: "String",
          Description: "Domain name for the hosted zone",
          Default: "example.com",
        },
      },
    });

    if (localUIDevelopmentDomainName) {
      cft = cft.patch({
        Resources: {
          [localUIDevelopmentDomainName]: {
            Type: "AWS::Route53::RecordSet",
            DeletionPolicy: "Delete",
            Properties: {
              HostedZoneId: {
                Ref: hostedZoneIdParameterName,
              },
              Type: "A",
              Name: {
                "Fn::Sub": [
                  "app-local.${BaseDomainName}",
                  {
                    BaseDomainName: {
                      Ref: domainNameParameterName,
                    },
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
