/**
 * @packageDocumentation
 *
 * IaC exports. Use {@link Packs} for resource packs, {@link Utils} for template
 * helpers, and {@link SimpleCFT} for fluent template composition.
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
