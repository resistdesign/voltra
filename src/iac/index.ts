/**
 * @packageDocumentation
 *
 * Infrastructure-as-code entrypoint.
 *
 * Import from the IaC subpath only:
 * ```ts
 * import * as IaC from "@resistdesign/voltra/iac";
 * ```
 *
 * @example
 * ```ts
 * import * as IaC from "@resistdesign/voltra/iac";
 *
 * const cft = new IaC.SimpleCFT().applyPack(IaC.Packs.addDNS, {
 *   hostedZoneIdParameterName: "<YOUR_INFO_HERE>",
 *   domainNameParameterName: "<YOUR_INFO_HERE>",
 *   localUIDevelopmentDomainName: "<YOUR_INFO_HERE>",
 *   localUIDevelopmentIPAddress: "<YOUR_INFO_HERE>",
 * });
 *
 * console.log(cft.template);
 * ```
 *
 * Use {@link Packs} for reusable resource packs, {@link Utils} for template
 * helpers, and {@link SimpleCFT} for fluent template composition.
 *
 * See also: `@resistdesign/voltra/iac/packs` for direct pack imports.
 */
/**
 * Use packs for easily building infrastructure with reusable components.
 */
export * as Packs from "./packs";
/**
 * Utilities allow for easy modification and extension of infrastructure templates.
 */
export * as Utils from "./utils";
export * from "./SimpleCFT";
