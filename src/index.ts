/**
 * Route RPC back-end API requests to the appropriate functions with context about authentication, the request itself and more.
 * */
export * as API from "./api";

/**
 * Build front-end applications with React/TypeScript, layout systems, form generation, RPC requests, easy state management and more.
 *
 * @see {@link getEasyLayout}, {@link TypeStructureComponent} and {@link useApplicationStateLoader} for some great starting points.
 * */
export * as App from "./app";

/**
 * Build infrastructure as code with reusable components and utilities.
 *
 * @usage Start with `SimpleCTF`, add packs and use utilities as needed.
 *
 * @example
 * ```typescript
 * import { SimpleCTF } from '@resistdesign/voltra/iac';
 *
 * const ctf = new SimpleCTF()
 *   .applyPack(
 *     addDNS,
 *     {
 *       hostedZoneIdParameterName: "<YOUR_INFO_HERE>"
 *       domainNameParameterName: "<YOUR_INFO_HERE>"
 *       localUIDevelopmentDomainName: "<YOUR_INFO_HERE>"
 *       localUIDevelopmentIPAddress: "<YOUR_INFO_HERE>"
 *     }
 *   );
 *
 * console.log(cft.template);
 *  ```
 * */
export * as IaC from "./iac";
