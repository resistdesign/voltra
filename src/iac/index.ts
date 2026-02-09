/**
 * @packageDocumentation
 *
 * Infrastructure-as-code entrypoint.
 *
 * Import from the IaC subpath only:
 * ```ts
 * import { SimpleCFT } from "@resistdesign/voltra/iac";
 * import { addDNS } from "@resistdesign/voltra/iac/packs";
 * ```
 *
 * @example
 * ```ts
 * import { SimpleCFT } from "@resistdesign/voltra/iac";
 * import { addDNS } from "@resistdesign/voltra/iac/packs";
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
/**
 * @category iac
 * @group Core
 */
export * from "./SimpleCFT";
/**
 * @category iac
 * @group Utilities
 */
export * from "./utils";
