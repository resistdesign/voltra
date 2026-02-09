/**
 * @packageDocumentation
 *
 * Infrastructure-as-code entrypoint.
 *
 * Import from the IaC subpath only:
 * ```ts
 * import { SimpleCFT, addDNS } from "@resistdesign/voltra/iac";
 * ```
 *
 * @example
 * ```ts
 * import { SimpleCFT, addDNS } from "@resistdesign/voltra/iac";
 *
 * const cft = new SimpleCFT().applyPack(addDNS, {
 *   hostedZoneIdParameterName: "<YOUR_INFO_HERE>",
 *   domainNameParameterName: "<YOUR_INFO_HERE>",
 *   localUIDevelopmentDomainName: "<YOUR_INFO_HERE>",
 *   localUIDevelopmentIPAddress: "<YOUR_INFO_HERE>",
 * });
 *
 * console.log(cft.template);
 * ```
 *
 * Use flat exports for reusable resource packs and template helpers.
 *
 * See also: `@resistdesign/voltra/iac/packs` for direct pack imports.
 */
export * from "./SimpleCFT";
export * from "./packs";
export * from "./utils";
