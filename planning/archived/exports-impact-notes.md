# Exports Impact Notes

## Scope and Intent
This effort keeps existing public subpath entrypoints and makes each domain entrypoint easier to consume with domain-flat named imports.

## Consumer-Facing Changes

### New ability: named imports from each domain
Consumers should be able to import common symbols directly from domain entrypoints, for example:

```ts
import { RouteMap } from "@resistdesign/voltra/api";
import type { TypeInfo } from "@resistdesign/voltra/common";
import { TypeInfoORMServiceError } from "@resistdesign/voltra/common";
```

### What remains
Namespace exports may continue to exist for compatibility, but they become optional rather than required for normal consumption.

### What stays prohibited
Root import remains unsupported:

```ts
import { Anything } from "@resistdesign/voltra"; // unsupported by contract
```

## Risk Areas
- Declaration pipeline changes may affect downstream TypeScript toolchains and IDE resolution behavior.
- Export surface changes may break code that depends on namespace-object-only access patterns.
- If `tsc` emits unexpected declaration path references, consumers may see unintended `.d.ts` path exposure.

## Mitigation Strategy
- Contract tests: enforce a stable set of valid imports from supported public subpaths.
- CI checks for hashed declarations: fail if any `*-<hash>.d.ts` files appear in built output.
- Controlled site/demo refactor: migrate internal usage in isolated, reviewable increments.

## Baseline Command Evidence (Phase 0B)

### Export Checks
- `yarn test:exports`: pass (`Export validation passed.`).
- `yarn test:consumer`: initial run failed due to local npm cache permissions in `/Users/ryan/.npm`.
- `NPM_CONFIG_CACHE="/tmp/voltra-npm-cache" yarn test:consumer`: pass.

### Build Output Baseline
- `yarn build`: pass.
- Build currently runs `tsup && yarn prep-dist` and produces declaration bundles with hash suffixes.

### `dist/` Summary (`ls -la dist`)
- Entrypoint folders present: `api/`, `app/`, `common/`, `iac/`, `native/`, `web/`.
- Package assembly artifacts present: `package.json`, `README.md`, `.npmignore`.
- Unexpected root-level declaration artifacts present with hash suffixes.

### Hashed `.d.ts` Evidence
Observed in `dist/`:
- `dist/index-DgOzPKdr.d.ts`
- `dist/Types-ytlubEUw.d.ts`
- `dist/types-BMdfSr4v.d.ts`
- `dist/Validation-C6sBQ4NV.d.ts`
- `dist/SearchTypes-BflxO0Qb.d.ts`
- `dist/History-DMHOF02n.d.ts`
- `dist/ItemRelationshipInfoTypes-DgpBz7hD.d.ts`
- `dist/createAutoField-BIgp2Qlr.d.ts`

Observed in `yarn test:consumer` tarball listing:
- `index-DgOzPKdr.d.ts`
- `Types-vWHZZgxr.d.ts`
- `types-BMdfSr4v.d.ts`
- `Validation-C6sBQ4NV.d.ts`
- `SearchTypes-BflxO0Qb.d.ts`
- `History-_D7_jY7T.d.ts`
- `ItemRelationshipInfoTypes-DgpBz7hD.d.ts`
- `createAutoField-BIgp2Qlr.d.ts`

## Hash Source Investigation (Phase 1A)

### Where are the hashes coming from?
Hash-suffixed declaration files are produced by `tsup` declaration output, not by plain `tsc` declaration emit.

### Evidence
- Build log shows `DTS Build start` and `DTS ...` outputs directly during `tsup`, including:
  - `dist/index-DgOzPKdr.d.ts`
  - `dist/Types-ytlubEUw.d.ts`
  - `dist/Validation-C6sBQ4NV.d.ts`
  - `dist/SearchTypes-BflxO0Qb.d.ts`
  - `dist/History-DMHOF02n.d.ts`
  - `dist/ItemRelationshipInfoTypes-DgpBz7hD.d.ts`
  - `dist/createAutoField-BIgp2Qlr.d.ts`
  - `dist/types-BMdfSr4v.d.ts`
- `tsup.config.ts` currently enables declaration output with `dts: true` for the main build entry group.
- `package.json` currently runs `build: "tsup && yarn prep-dist"`, so declarations are sourced from `tsup` in the current pipeline.

## Build Chain Audit (Phase 1B)

### `package.json` scripts and packaging
- `build`: `tsup && yarn prep-dist`
- `prep-dist`: `node ./scripts/prep-dist.mjs`
- No `prepack` script is defined.
- `files` field includes root-level `*.d.ts` / `*.d.ts.map` and domain folders (`api/**`, `common/**`, etc.).

### `tsup.config.ts`
- Main domain build:
  - Bundled ESM JS output to `dist/`
  - `dts: true` (source of hashed declaration bundle artifacts)
  - `clean: true`
- CLI build (`common/Testing/CLI`):
  - Bundled ESM JS output
  - No declaration generation
  - `clean: false`

### TypeScript configs
- `tsconfig.json`:
  - `module: "ESNext"`, `moduleResolution: "bundler"`, `outDir: "dist"`, `declaration: true`.
- `tsconfig.build.json`:
  - `extends: "./tsconfig.json"`, `rootDir: "src"`, `outDir: "dist"`, `declaration: true`, `declarationMap: true`.

### Ignore/packing files
- `.npmignore` exists and is copied into `dist/.npmignore` by `scripts/prep-dist.mjs`.
- `scripts/prep-dist.mjs` assembles `dist/package.json` from selected root package metadata (`exports`, `files`, etc.) and copies `README.md` + `.npmignore`.

## Build Chain Decision (Phase 1B)
- JS emitter: `tsup` (retain for JS bundling).
- DTS emitter: `tsc` via declaration-only emit (`tsconfig.build.json`).
- Dist/package assembly step: existing `prep-dist` script (`scripts/prep-dist.mjs`) remains the assembly step.

## Pipeline Implementation and Validation (Phase 1C/1D)

### Implemented Changes
- `tsup.config.ts`: set main build `dts: false` (JS-only from `tsup`).
- `package.json`:
  - `build` changed to `tsup && yarn build:types && yarn prep-dist`.
  - added `build:types`: `tsc -p tsconfig.build.json --emitDeclarationOnly`.
- `tsconfig.build.json`: excluded `**/*.test-utils.ts` and `**/*.test-utils.tsx` to avoid declaration graph pulling `site/` files outside `rootDir`.
- `scripts/prep-dist.mjs`: removes stale `dist/src` and `dist/site` directories before writing final package metadata.

### Validation Results
- `yarn build`: pass after changes.
- Root-level hash declaration check:
  - `find dist -maxdepth 1 -type f -name '*-*.d.ts'` => no matches.
- Dist top-level folder check (`ls -la dist`):
  - Present: `api`, `app`, `build`, `common`, `iac`, `native`, `web`, plus package artifacts.
  - Removed unexpected stale folders: `src`, `site`.
- Required domain entrypoints validated for JS + DTS:
  - `api`, `app`, `common`, `iac`, `iac/packs`, `native`, `web` all have `index.js` + `index.d.ts`.
- Declaration reference hygiene:
  - No `.js` extension imports found in emitted `.d.ts` files.
  - No `.d.ts` extension import specifiers found in emitted `.d.ts` files.
- Pack validation:
  - `npm pack --dry-run --json` (from `dist/`) passes.
  - No `src/`, no `site/`, and no spec files included.

### Current Observations to Carry Forward
- `dist/build/` currently contains `index.d.ts` but no `index.js`.
- This predates the hash-removal shift and should be handled in later export-surface validation phases where `./build` runtime contract is verified.

## IDE/Resolver Stability Validation (Phase 2)
- Existing consumer fixture (`scripts/consumer-smoke.mjs`) already validates with:
  - package consumer `type: "module"`
  - TypeScript `module: "ESNext"`
  - TypeScript `moduleResolution: "bundler"`
- Fixture confirms:
  - allowed subpath imports compile
  - deep blocked subpath imports fail
- With hash artifacts removed from package-root declarations, there are no hash-named declaration modules left for IDE auto-import discovery in package root.

## Export Map and Types Map Validation (Phase 2)
- `tsup` entry map now includes `build/index` (`src/build/index.ts`), producing `dist/build/index.js`.
- Verified `dist` now contains JS + DTS for:
  - `api/index`
  - `app/index`
  - `web/index`
  - `native/index`
  - `common/index`
  - `iac/index`
  - `iac/packs/index`
  - `build/index`
- Added `typesVersions` in root `package.json` for `api`, `app`, `web`, `native`, `common`, `iac`, `iac/packs`, and `build`.
- Updated `scripts/prep-dist.mjs` to include `typesVersions` in generated `dist/package.json`.
- Confirmed `exports["./build"]` remains present and mapped as explicit opt-in:
  - types => `./build/index.d.ts`
  - import => `./build/index.js`
- Post-change verification:
  - `yarn test:exports`: pass
  - `yarn test:consumer` (with temp npm cache): pass

## Domain-Flat Export Progress (Phase 3A/3B)
- `src/api/index.ts` now re-exports router symbols flat via `export * from "./Router";` while preserving `export * as Routing`.
  - This enables `import type { RouteMap } from "@resistdesign/voltra/api"` and `import { addRoutesToRouteMap } from "@resistdesign/voltra/api"`.
- `src/common/index.ts` now exposes flat TypeInfo/ORM symbols while preserving namespace exports:
  - `TypeOperation` (runtime enum)
  - `TypeInfo`, `TypeInfoMap`, `TypeInfoField`, `SupportedTags`, `SupportedFieldTags`, `DeniedOperations` (types)
  - `TypeInfoORMServiceError` (runtime enum)
- `scripts/consumer-smoke.mjs` was extended to compile and use the new imports directly:
  - `RouteMap`, `addRoutesToRouteMap` from `@resistdesign/voltra/api`
  - `TypeInfo`, `TypeInfoORMServiceError` from `@resistdesign/voltra/common`
- Verification after changes:
  - `yarn build`: pass
  - `yarn test:exports`: pass
  - `yarn test:consumer` (with temp npm cache): pass

## Domain-Flat Export Progress (Phase 3C/3D)
- `src/web/index.ts` now includes flat re-exports from both `./forms` and `./utils`, while preserving `Forms`/`Utils` namespaces.
  - This exposes `createWebFormRenderer`, `AutoField`, `AutoForm`, `getEasyLayout`, and related utilities at `@resistdesign/voltra/web` top level.
- `src/native/index.ts` now includes flat re-exports from both `./forms` and `./utils`, while preserving namespace exports.
  - This exposes `createNativeFormRenderer`, `makeNativeEasyLayout`, and related native utilities at `@resistdesign/voltra/native` top level.
- `src/app/index.ts` now includes flat re-exports from both `./utils` and `./forms`, while preserving namespace exports.
  - This exposes `parseTemplate`, `computeTrackPixels`, and other app-core utilities at `@resistdesign/voltra/app` top level.
- `scripts/consumer-smoke.mjs` was expanded to compile-import these top-level symbols and validate the contract in CI/local checks.
  - Added `@types/react` to the fixture dev dependencies so native declaration types compile in the smoke consumer.
- Verification after changes:
  - `yarn build`: pass
  - `yarn test:exports`: pass
  - `yarn test:consumer` (with temp npm cache): pass

## Site-Driven Gap Closure (Phase 4 Initial Pass)
- Audited `site/api/index.ts` imports/usage first.
- Identified missing common-root symbols used there:
  - `ERROR_MESSAGE_CONSTANTS`
  - `PRIMITIVE_ERROR_MESSAGE_CONSTANTS`
- Source location: `src/common/TypeParsing/Validation.ts`.
- Target public domain entrypoint: `@resistdesign/voltra/common`.
- Implemented by adding `export * from "./TypeParsing/Validation";` in `src/common/index.ts`.
- Added consumer smoke import coverage for both constants to prevent regression.
- Validation after this pass:
  - `yarn build`: pass
  - `yarn test:exports`: pass
  - `yarn test:consumer` (with temp npm cache): pass

## Site-Driven Gap Closure (Phase 4 Complete Coverage)
- Audited all direct `site/** -> src/**` imports and ensured corresponding symbols are reachable from public domain entrypoints.
- Additional API domain-flat exports added:
  - `src/api/index.ts`: `export * from "./Indexing";`, `export * from "./ORM";`, `export * from "./DataAccessControl";`
  - `src/api/ORM/index.ts`: `export * from "./drivers";` in addition to existing `Drivers` namespace export.
- Additional Common domain-flat exports added:
  - `src/common/index.ts`: `export * from "./CommandLine";` and `export * from "./TypeParsing/Validation";`
- Consumer smoke contract expanded to include representative symbols used in site code:
  - API: `getTypeInfoORMRouteMap`, `DynamoDBDataItemDBDriver`, `createAwsSdkV3DynamoClient`, `FullTextDdbBackend`, `DACConstraintType`
  - Common: `collectRequiredEnvironmentVariables`, `ERROR_MESSAGE_CONSTANTS`, `PRIMITIVE_ERROR_MESSAGE_CONSTANTS`
- Validation after complete pass:
  - `yarn build`: pass
  - `yarn test:exports`: pass
  - `yarn test:consumer` (with temp npm cache): pass

## Docs and Site Canonicalization (Phase 5 Partial)
- `README.md` updated to domain-flat imports:
  - Added a domain-oriented "Common imports by domain" section.
  - Replaced nested namespace examples (`Utils`, `Forms`) with top-level imports from domain entrypoints.
  - Kept root import unsupported guidance intact.
- Site demo source files were refactored from deep nested source imports to domain entrypoint imports within `src/*`:
  - `site/api/index.ts`
  - `site/api/routeMap.ts`
  - `site/api/indexing.ts`
  - `site/common/IndexingTableNames.ts`
  - `site/common/DemoTypeInfoMap.ts`
  - `site/build-demo-types.ts`
  - `site/iac/index.ts`
- Verification:
  - `yarn site:build:api`: pass
  - `yarn site:build:app`: pass
  - Includes successful `yarn doc` and `yarn doc-to-site` via finalize-site.
- Noted warnings:
  - TypeDoc completed with warnings (no hard errors); warnings are tracked for later doc-structure/readability phases.

## TypeDoc Audit and Grouping Strategy (Phase 5C)
### Current TypeDoc Configuration
- Config file: `typedoc.json`.
- Entry points:
  - `src/api/index.ts`
  - `src/app/index.ts`
  - `src/web/index.ts`
  - `src/native/index.ts`
  - `src/build/index.ts`
  - `src/common/index.ts`
  - `src/iac/index.ts`
  - `src/iac/packs/index.ts`
- Build script: `yarn doc` (`typedoc`), followed by `yarn doc-to-site`.
- Current behavior:
  - Domain entrypoint pages are generated and navigable.
  - Re-exported symbols generally link back to concrete source definitions (`Defined in .../src/...`).
  - `excludeNotDocumented: true` plus broad flat exports produces a noisy mixed surface without explicit category organization.

### Documentation Grouping Strategy
- API categories:
  - `API/Routing`
  - `API/ORM`
  - `API/Indexing`
  - `API/Auth-DAC`
  - `API/RPC`
- Common categories:
  - `Common/TypeParsing`
  - `Common/TypeInfo`
  - `Common/Search`
  - `Common/StringTransformers`
  - `Common/Logging`
  - `Common/CommandLine`
- Web/Native/App categories:
  - `Forms/Core`
  - `Forms/Web`
  - `Forms/Native`
  - `EasyLayout/Core`
  - `EasyLayout/Web`
  - `EasyLayout/Native`
  - `Routing/Web`
  - `Routing/Native`
- IaC/Build categories:
  - `IaC/Core`
  - `IaC/Packs`
  - `Build/TypeParsing`

### Remaining Doc-Readability Work
- Add `@category` tags to key source declarations (not only barrels) using the strategy above.
- Re-run TypeDoc and verify domain pages remain navigable with reduced barrel noise.
- Optionally tune TypeDoc settings for category-first presentation if needed after tags are added.

## Phase 5/6 Progress Update (Current Run)
### Declaration maps and hash/noise controls
- Disabled declaration maps in `tsconfig.build.json` (`declarationMap: false`) to avoid IDE `.d.ts.map` noise.
- Rebuilt and verified:
  - `yarn build`: pass
  - `find dist -type f -name '*.d.ts.map' | wc -l`: `0`
- Added explicit no-hash assertion logic in `scripts/check-package-exports.mjs`:
  - Fails if `dist/**/*.d.ts` includes hash-like suffixes (e.g., `*-ABC123.d.ts`).
  - Current dist check result: `0` hash-like declaration files.

### Export contract hardening (`yarn test:exports`)
- Extended `scripts/check-package-exports.mjs` to enforce:
  - required export subpaths include `./build`,
  - required built artifacts include `build/index.js` and `common/index.js`,
  - required runtime exports by subpath:
    - api: `addRoutesToRouteMap`, `handleCloudFunctionEvent`
    - common: `TypeInfoORMServiceError`
    - web: `createWebFormRenderer`, `AutoField`
    - native: `createNativeFormRenderer`
    - build: `getTypeInfoMapFromTypeScript`
  - type-contract compile probe for:
    - `RouteMap`
    - `TypeInfo`, `TypeInfoMap`
    - plus the runtime symbols above through public subpaths.
- Validation:
  - `yarn test:exports`: pass

### TypeDoc grouping tags added in source declarations
- Added `@category` tags on underlying declarations (not just barrels), including:
  - Routing: `RouteMap`, `addRoutesToRouteMap`, `handleCloudFunctionEvent`
  - TypeInfo: `TypeOperation`, `TypeInfo`, `TypeInfoMap`, `getTypeInfoMapFromTypeScript`
  - ORM: `TypeInfoORMServiceError`
  - Forms: `createWebFormRenderer`, `AutoField`, `createNativeFormRenderer`
  - EasyLayout: `parseTemplate`, `computeTrackPixels`, `makeNativeEasyLayout`
- Re-generated docs/site and spot-checked category grouping:
  - `yarn doc`: pass (warnings only)
  - `yarn site:build:app`: pass
  - Spot check confirms category sections now appear on domain pages (examples seen: `Routing`, `ORM`, `Forms`, `EasyLayout`).

### README/examples/spec alignment
- README cleanup:
  - removed stale `Utils.*` wording in EasyLayout section,
  - maintained root-import unsupported guidance,
  - kept unsupported deep-import example.
- Added `examples/` domain files:
  - `examples/api.ts`
  - `examples/common.ts`
  - `examples/web.ts`
  - `examples/native.ts`
  - `examples/build.ts`
- README now references all example files.
- Spec/import sweep result:
  - no `src/**/*.spec.json` entries required import-snippet rewrites for this contract.

### End-to-end verification in this run
- `yarn build`: pass
- `yarn test:exports`: pass
- `yarn test:consumer` (temp npm cache): pass
- `yarn doc`: pass (warnings only)
- `yarn site:build:app`: pass

### Remaining blocker
- `yarn start` remains blocked in this environment:
  - `getaddrinfo ENOTFOUND docs-local.voltra.app`

## Optional Cleanup Decisions (Phase 7)
- Soft deprecation added for namespace exports in:
  - `src/api/index.ts`
  - `src/common/index.ts`
  - `src/web/index.ts`
  - `src/native/index.ts`
  - `src/app/index.ts`
- Decision recorded:
  - Keep namespaces for compatibility for now.
  - Prefer flat domain exports for all README/site/demo usage and consumer-facing “first-choice” imports.
  - Treat namespace exports as legacy convenience and document them with `@deprecated` guidance to flat imports.

## Phase 8 Completion Evidence
- Demo-site import cleanup:
  - tightened type-only imports and consolidated duplicate imports in:
    - `site/build-demo-types.ts`
    - `site/common/DemoTypeInfoMap.ts`
    - `site/api/routeMap.ts`
    - `site/api/index.ts`
- Full verification matrix:
  - `yarn build`: pass
  - `yarn test`: pass (`PASSES: 186`, `FAILURES: 0`)
  - `yarn test:exports`: pass
  - `yarn test:consumer` (temp npm cache): pass
  - `npm pack --dry-run` with temp npm cache: pass
  - `find dist -type f -name '*.d.ts.map' | wc -l`: `0`
- Consumer-condition check:
  - published tarball dry-run succeeds and contains expected domain entry artifacts.
  - export contract and consumer smoke both pass after final import/test updates.
- Documentation/reference sweep:
  - canonical docs/examples reflect latest contract.
  - `planning/complete/` files intentionally remain historical; not canonical API usage guidance.
