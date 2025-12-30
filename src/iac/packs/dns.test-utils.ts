import { SimpleCFT } from "../SimpleCFT";
import { addDNS } from "./dns";

export const runDNSPackScenario = () => {
  const defaultTemplate = new SimpleCFT()
    .applyPack(addDNS, {
      id: "AppDNS",
      hostedZoneId: "HZ123",
      domainName: "app.example.com",
      resourceRecords: ["203.0.113.10"],
    })
    .toJSON();

  const customTemplate = new SimpleCFT()
    .applyPack(addDNS, {
      id: "AppDNS",
      hostedZoneId: "HZ456",
      domainName: "app.example.com",
      resourceRecords: ["alias.example.com"],
      recordType: "CNAME",
    })
    .toJSON();

  const defaultResources = defaultTemplate.Resources || {};
  const customResources = customTemplate.Resources || {};
  const defaultRecord = defaultResources.AppDNS as any;
  const customRecord = customResources.AppDNS as any;

  return {
    resourceKeys: Object.keys(defaultResources).sort(),
    defaultRecordType: defaultRecord?.Properties?.Type,
    defaultTTL: defaultRecord?.Properties?.TTL,
    defaultHostedZoneId: defaultRecord?.Properties?.HostedZoneId,
    defaultDomainName: defaultRecord?.Properties?.Name,
    defaultResourceRecords: defaultRecord?.Properties?.ResourceRecords,
    customRecordType: customRecord?.Properties?.Type,
    customTTL: customRecord?.Properties?.TTL,
    customResourceRecords: customRecord?.Properties?.ResourceRecords,
  };
};
