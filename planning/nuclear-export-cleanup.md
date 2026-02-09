# Plan: Fix Voltra Exports, Declarations, and IDE Imports (Domain-Flat, No Hash Junk)

## North Star

Keep the existing public entrypoints:

- `@resistdesign/voltra/api`
- `@resistdesign/voltra/app`
- `@resistdesign/voltra/common`
- `@resistdesign/voltra/web`
- `@resistdesign/voltra/native`
- `@resistdesign/voltra/iac`
- `@resistdesign/voltra/iac/packs`
- `@resistdesign/voltra/build` (explicit opt-in; contains TypeScript compiler deps)

…but make each entrypoint **domain-flat**, so consumers can import commonly used symbols directly:

```ts
import { RouteMap } from "@resistdesign/voltra/api";
import { TypeInfo, TypeInfoORMServiceError } from "@resistdesign/voltra/common";
```

No more `API.Routing.RouteMap`, `Common.TypeParsing.TypeInfo`, etc.

---

## Root Causes Observed

- **Hashed declaration artifacts** are being generated (e.g. `ItemRelationshipInfoTypes-<hash>.d.ts`, `index-<hash>.d.ts`). These leak into IDE auto-import and create invalid/unstable suggestions.
- Several high-value symbols exist in `src/` but are **not reachable from the domain entrypoints** (e.g. `TypeInfoORMServiceError` lives under `src/common/TypeInfoORM`, but `src/common/index.ts` does not export it).
- Some symbols are **exported only as nested namespaces**, so a consumer can’t cleanly do `import { TypeInfo } from "@resistdesign/voltra/common";`.
- `@resistdesign/voltra/build` is documented as public, but build output/config has historically been inconsistent (must verify it is actually built and shipped).

---

## Context and Constraints (Must Read First)

### What is broken right now

- Consumers are struggling to import anything reliably from Voltra.
- Common symbols are hidden behind nested namespace exports.
  - Example pain: `RouteMap` requires going through `Routing` instead of `import { RouteMap } from "@resistdesign/voltra/api";`.
  - Example pain: `TypeInfo` is not reachable as `import type { TypeInfo } from "@resistdesign/voltra/common";`.
- Symbols used by the demo site (for example, `TypeInfoORMServiceError`) are not importable from public entrypoints.
- IDE auto-import is producing invalid suggestions, including imports referencing hash-named `.d.ts` siblings.

### Why this is happening

- The published package contains hashed declaration artifacts (e.g. `index-<hash>.d.ts`, `Types-<hash>.d.ts`).
  - These appear to be produced by declaration bundling in the JS bundler toolchain.
  - Their presence causes IDEs to discover unstable sibling module specifiers and suggest invalid imports.
- The current export strategy largely uses namespace-style exports:
  - `export * as Routing from "./Router"` rather than `export { RouteMap, ... } from "./Router"`.
  - `export * as TypeParsing from "./TypeParsing"` rather than `export type { TypeInfo, ... } ...`.
  - This forces consumers into deep property access and prevents simple named imports.

### Explicit constraints

- Keep public subpath entrypoints as-is (do NOT collapse into root import):
  - `@resistdesign/voltra/api`, `/common`, `/app`, `/web`, `/native`, `/iac`, `/iac/packs`, `/build`.
- Root import `@resistdesign/voltra` remains intentionally unsupported (documentation says so)【49†source】.
- `@resistdesign/voltra/build` remains explicit opt-in and may include TypeScript compiler dependencies.
- The goal is **domain-flat** imports inside each entrypoint (not a new alias entrypoint).

### Desired import contract

```ts
import { RouteMap } from "@resistdesign/voltra/api";
import type { TypeInfo } from "@resistdesign/voltra/common";
import { TypeInfoORMServiceError } from "@resistdesign/voltra/common";
```

### Technical decision considerations

The executing agent must make deliberate choices and capture rationale, specifically for:

- DTS generation strategy
  - Why `tsc --emitDeclarationOnly` is chosen vs bundler-generated dts
  - Impact on declaration maps (`.d.ts.map`) and source references
  - Ensuring no `.ts` import extensions are introduced

- Export surface design
  - Which symbols become domain-flat vs remain grouped under namespaces
  - How to avoid name collisions when flattening
  - How to preserve runtime tree-shaking and avoid heavy cross-domain imports

- Backwards compatibility
  - Whether to keep old namespace exports in addition to flat exports
  - How to document migration without creating dual-canon confusion

- IDE auto-import stability
  - How `typesVersions`, `exports`, and produced dts layout influence auto-import
  - How to prevent deep import leakage and hash artifacts from being suggested

---

## Phase 0: Impact Review + Safety Rails (Before Changing Anything)

### 0A: Impact Review Notes (Required)

- [x] Create `planning/exports-impact-notes.md` (or update if it exists)
  - [x] Summarize what will change for consumers
    - [x] New ability: named imports from each domain
    - [x] What remains: namespaces may still exist, but become optional
    - [x] What stays prohibited: root import remains unsupported
  - [x] Summarize risk areas
    - [x] Declaration pipeline changes may affect downstream TS toolchains
    - [x] Export surface changes may break any code relying on namespace objects
    - [x] If `tsc` emits different path references, it may expose unintended `.d.ts` imports
  - [x] Summarize mitigation strategies
    - [x] Contract tests
    - [x] CI checks for hashed dts
    - [x] Controlled site/demo refactor

### 0B: Safety Rails (Baseline)

- [x] Run existing export checks
  - [x] `yarn test:exports`
  - [x] `yarn test:consumer`

- [x] Capture current dist/package shape
  - [x] `yarn build`
  - [x] Record `ls -la dist/` summary
  - [x] Record whether hashed `.d.ts` files exist in the built artifact output

- [x] Create an “import contract” list (temporary but authoritative)
  - [x] Create or update `planning/exports-contract.md` listing the exact imports we require to work (see Phase 6)


- [x] Run existing export checks
  - [x] `yarn test:exports`
  - [x] `yarn test:consumer`

- [x] Capture current dist/package shape
  - [x] `yarn build`
  - [x] Record `ls -la dist/` summary
  - [x] Record whether hashed `.d.ts` files exist in the published artifact output

- [x] Add/confirm a single “import contract” doc snippet (temporary, internal)
  - [x] Create `planning/exports-contract.md` (or similar) listing the exact imports we require to work (see Phase 6)

---

## Phase 1: Build Configuration Audit (Stop Hash Artifacts, Confirm Correct Output)

### Goal

Confirm the build configuration is correct and then adjust it so the published package:

- contains only expected entrypoint folders (`api`, `common`, etc.)
- emits stable `.js` and stable `.d.ts` files (no `*-<hash>.d.ts` siblings)
- has correct ESM output, correct `package.json` export map
- does not ship internal sources/tests

### Tasks

#### 1A: Identify the hash source (Required Notes)

- [x] Add a section to `planning/exports-impact-notes.md`:
  - [x] "Where are the hashes coming from?"
  - [x] Capture evidence:
    - [x] Which tool created the hashed `.d.ts` files (tsup dts bundling vs other)
    - [x] Which config flag enables it
    - [x] The exact filenames observed

#### 1B: Audit the actual build chain

- [x] Inspect and summarize these configs (notes go into `exports-impact-notes.md`):
  - [x] `package.json` scripts (`build`, `prepack`, any `prep-dist`)
  - [x] `tsup.config.ts`
  - [x] `tsconfig.json`
  - [x] `tsconfig.build.json`
  - [x] any `.npmignore` / `files` field / packing scripts

- [x] Decide and document:
  - [x] "Which tool emits JS?" (tsup)
  - [x] "Which tool emits DTS?" (tsc)
  - [x] "Which step assembles dist/package.json?" (prep script)

#### 1C: Implement the correct build pipeline (No hash output)

- [x] Update `tsup.config.ts` to emit **JS only**
  - [x] Disable `dts` output (so it cannot generate hashed declaration bundles)

- [x] Add a declaration-only build step via TypeScript
  - [x] Add script: `build:types`: `tsc -p tsconfig.build.json --emitDeclarationOnly`
  - [x] Confirm output writes `.d.ts` into the same `dist/` structure expected by `exports`

- [x] Update `yarn build` to:
  - [x] run `tsup` (JS)
  - [x] run `yarn build:types` (DTS)
  - [x] run the existing dist assembly step (`prep-dist` or equivalent)

#### 1D: Validate dist/package contents

- [x] After `yarn build`, verify in `dist/`:
  - [x] No files matching `*-<hash>.d.ts` in the package root
  - [x] No extra unexpected folders
  - [x] Each entrypoint has:
    - [x] `dist/api/index.js` + `dist/api/index.d.ts`
    - [x] `dist/common/index.js` + `dist/common/index.d.ts`
    - [x] etc.

- [x] Validate publish packing
  - [x] Run `npm pack --dry-run` (or yarn equivalent) and confirm only intended files are included
  - [x] Ensure `src/` and test specs are not shipped (unless intentionally)

---

## Phase 2: Fix Declaration Output (Stable DTS Layout for IDEs)

### Goal

Emit `.d.ts` files using **TypeScript `tsc` emit** (stable file names, stable paths), not bundled/hashed declarations.

### Tasks

- [x] Confirm `tsc` output does not introduce `.js` extension imports for `.ts` sources
- [x] Confirm the `.d.ts` files reference only stable, existing `.d.ts` siblings
- [x] If `.d.ts.map` causes IDE noise, disable it and re-validate

- [x] Validate: no hashed `.d.ts` output
  - [x] After `yarn build`, confirm `dist/` does **not** contain `index-<hash>.d.ts`, `Types-<hash>.d.ts`, etc.

- [x] Validate: IDE auto-import stabilizes
  - [x] Add/extend a consumer fixture project:
    - [x] `type: module`
    - [x] TS `module: ESNext`
    - [x] TS `moduleResolution: bundler` (or `nodenext` if required)
  - [x] Ensure IDE/TS resolves only from `exports`-allowed paths
  - [x] Ensure no suggestions appear from hash files or deep internal folders


### Goal

Emit `.d.ts` files using **TypeScript `tsc` emit** (stable file names, stable paths), not bundled/hashed declarations.

### Tasks

- [x] Update `tsup.config.ts` to **stop producing declaration bundles**
  - [x] Ensure `dts` is disabled (or removed), so `tsup` outputs **JS only**
  - [x] Keep ESM output as-is

- [x] Add a declaration-only build step using `tsc`
  - [x] Add script: `build:types`: `tsc -p tsconfig.build.json --emitDeclarationOnly`
  - [x] Ensure `tsconfig.build.json` has:
    - [x] `declaration: true`
    - [x] `emitDeclarationOnly: true` (can live either in tsconfig or CLI)
    - [x] `declarationMap: false` (disabled to avoid IDE noise)
    - [x] `outDir: dist`

- [x] Update `yarn build` pipeline
  - [x] Change build script from `tsup && yarn prep-dist` to:
    - [x] `tsup` (JS)
    - [x] `yarn build:types` (DTS)
    - [x] `yarn prep-dist`

- [x] Validate: no hashed `.d.ts` output
  - [x] After `yarn build`, confirm `dist/` does **not** contain `*-<hash>.d.ts` files at the package root
  - [x] Confirm `dist/api/index.d.ts`, `dist/common/index.d.ts`, etc. exist and **do not import from hashed filenames**

- [x] Validate: IDE auto-import stabilizes
  - [x] Update `scripts/consumer-smoke.mjs` (or add a new consumer fixture) to compile a small ESM TS project importing from only the allowed subpaths
  - [x] Ensure TS does not “discover” random `.d.ts` siblings and propose them as module specifiers

---

## Phase 2: Ensure `package.json` Export Map + Types Map Are Correct

### Goal

Make Node + TS resolution deterministic and prevent deep imports.

### Tasks

- [x] Verify `package.json` `exports` includes only the intended public subpaths (it already does)
  - [x] Confirm each of these exists in `dist/` after build:
    - [x] `api/index.js` + `api/index.d.ts`
    - [x] `app/index.js` + `app/index.d.ts`
    - [x] `web/index.js` + `web/index.d.ts`
    - [x] `native/index.js` + `native/index.d.ts`
    - [x] `common/index.js` + `common/index.d.ts`
    - [x] `iac/index.js` + `iac/index.d.ts`
    - [x] `iac/packs/index.js` + `iac/packs/index.d.ts`
    - [x] `build/index.js` + `build/index.d.ts`

- [x] Add `typesVersions` to reduce TS/IDE confusion with subpath exports
  - [x] Add to `package.json`:
    - [x] `api -> api/index.d.ts`
    - [x] `app -> app/index.d.ts`
    - [x] `web -> web/index.d.ts`
    - [x] `native -> native/index.d.ts`
    - [x] `common -> common/index.d.ts`
    - [x] `iac -> iac/index.d.ts`
    - [x] `iac/packs -> iac/packs/index.d.ts`
    - [x] `build -> build/index.d.ts`

- [x] Confirm that `exports["./build"]` remains the explicit opt-in for TS-compiler-powered tooling (as documented)

---

## Phase 3: Domain-Flat Exports (The Actual DX Fix)

### Rules

- Keep the domain entrypoints (`/api`, `/common`, etc.)
- Inside each domain, re-export commonly used types/constants/functions at the **top-level** of that domain
- Namespaces can still exist internally, but consumers should not *need* them for primary flows

### 3A: `@resistdesign/voltra/api` (Flatten routing + high-frequency types)

- [x] In `src/api/index.ts`
  - [x] Re-export routing types and helpers directly from `./Router`:
    - [x] `export type { RouteMap, Route, RouteHandler, CloudFunctionResponse, ... } from "./Router";`
    - [x] `export { addRouteToRouteMap, addRoutesToRouteMap, addRouteMapToRouteMap, handleCloudFunctionEvent, ... } from "./Router";`
    - [x] `export * as AWS from "./Router/AWS";` (or keep under `AWS` if desired)
  - [x] Keep existing grouped exports for compatibility (optional but recommended initially):
    - [x] `export * as Routing from "./Router";` (can be deprecated later)

- [x] Verify the new desired import works:
  - [x] `import type { RouteMap } from "@resistdesign/voltra/api";`
  - [x] `import { addRoutesToRouteMap } from "@resistdesign/voltra/api";`

### 3B: `@resistdesign/voltra/common` (Expose `TypeInfo` and ORM errors)

- [x] In `src/common/index.ts`
  - [x] Add flat exports for TypeInfo core:
    - [x] `export type { TypeInfo, TypeInfoMap, TypeInfoField, SupportedTags, SupportedFieldTags, DeniedOperations, TypeOperation } from "./TypeParsing/TypeInfo";`
    - [x] `export { TypeOperation } from "./TypeParsing/TypeInfo";` (if consumers need the enum at runtime)
  - [x] Add flat exports for ORM-related shared types/errors (currently missing from common root):
    - [x] Export `TypeInfoORMServiceError` from `./TypeInfoORM/Types`
    - [x] If other `TypeInfoORM/*` symbols are commonly used, export them too (types first)
  - [x] Keep existing `export * as TypeParsing from "./TypeParsing";` for compatibility (optional but recommended initially)

- [x] Verify the new desired imports:
  - [x] `import type { TypeInfo } from "@resistdesign/voltra/common";`
  - [x] `import { TypeInfoORMServiceError } from "@resistdesign/voltra/common";`

### 3C: `@resistdesign/voltra/web` and `/native` (Forms + EasyLayout)

- [x] In `src/web/index.ts`
  - [x] Export form primitives directly:
    - [x] `export { createWebFormRenderer, withRendererOverride } from "./forms";` (or the correct module)
    - [x] `export { AutoField, AutoForm } from "./forms";` (where applicable)
  - [x] Export layout utilities directly:
    - [x] `export { getEasyLayout } from "./Utils";` (or correct path)

- [x] In `src/native/index.ts`
  - [x] Export native form renderer directly
  - [x] Export native easy-layout functions directly (`makeNativeEasyLayout`, etc.)

### 3D: `@resistdesign/voltra/app` (shared EasyLayout core)

- [x] In `src/app/index.ts`
  - [x] Export `parseTemplate`, `computeTrackPixels` directly (and any other “core” utilities)
  - [x] Keep `export * as Utils` as a grouping if desired

### 3E: `@resistdesign/voltra/build` (explicit opt-in)

- [x] Verify `src/build/index.ts` exists and exports the TS-compiler-powered functions used in docs
  - [x] Ensure it re-exports `getTypeInfoMapFromTypeScript` and friends

- [x] Ensure build output includes `dist/build/index.js` and `dist/build/index.d.ts`

---

## Phase 4: Remove/Reduce Namespace-Only Export Patterns (Where They Cause Pain)

### Goal

No symbol should be “declared but unreachable” due to namespace-only exporting.

- [x] Identify symbols used by the demo site that are not importable from public entrypoints
  - [x] Start with `site/api/index.ts` imports/usage
  - [x] For each symbol:
    - [x] Locate source file under `src/`
    - [x] Decide target domain entrypoint (`api`, `common`, etc.)
    - [x] Export it from that domain `index.ts`
    - [x] Add consumer smoke test line importing it

---

## Phase 5: Update Docs + Examples + Site (Correct, Up-to-Date, Clean)

### Goal

After export changes, the library must remain understandable and usable:

- docs must reflect the new domain-flat import contract
- examples must compile and run
- generated API docs must remain readable (not a single giant flat list)

### 5A: README and human-written docs

- [x] Update `README.md`
  - [x] Ensure it continues to emphasize stable public entrypoints (domain subpaths)【49†source】
  - [x] Replace any nested-namespace examples with domain-flat imports
  - [x] Add a “Common Imports” section per domain (api/common/web/native/build)
  - [x] Ensure all code snippets compile under ESM (`type: module`) and TS ESNext

- [~] Update any additional markdown docs under `docs/`, `site/`, `planning/complete/` that contain import snippets
  - Remaining:
    - Evaluate and update historical `planning/complete/*.md` references where outdated import snippets should remain canonical instead of historical.

### 5B: Site demo code (must be canonical)

- [x] Refactor `site/api/index.ts`
  - [x] Replace namespace patterns with domain-flat imports
  - [x] Ensure `TypeInfoORMServiceError`, `TypeInfo`, `RouteMap` are imported from their intended domains

- [x] Search/replace across `site/`
  - [x] Replace `API.Routing.` usage
  - [x] Replace `Common.TypeParsing.` usage
  - [x] Replace `WebUtils.Utils`-style access where it is no longer needed

- [~] Run the site build locally to confirm:
  - [ ] `yarn start`
  - [x] `yarn site:build:app`
  - Remaining:
    - `yarn start` currently fails in this environment with `getaddrinfo ENOTFOUND docs-local.voltra.app`.

### 5C: Generated API docs (TypeDoc) must stay readable

#### Rule

Domain-flat exports are good DX, but the generated docs must still present structure.

#### Tasks

- [x] Audit current TypeDoc configuration
  - [x] Locate TypeDoc config (typedoc.json / package.json config / build script)
  - [x] Document how TypeDoc currently groups modules and exports

- [x] Establish a documentation grouping strategy
  - [x] Decide categories that should appear in docs (example set):
    - [x] API: Routing, ORM, Indexing, Auth/DAC, RPC
    - [x] Common: TypeParsing/TypeInfo, SearchTypes, StringTransformers, Logging
    - [x] Web/Native: Forms, EasyLayout, Routing adapters
  - [x] Document these categories in `exports-impact-notes.md` so future contributors follow the same scheme

- [x] Add doc grouping tags to underlying source declarations (not just barrels)
  - [x] Add `@category <Name>` (or the project’s preferred tag) to the **actual** declarations
  - [x] Ensure commonly browsed modules are grouped and not one giant list

- [~] Ensure barrels do not become the only documented surface
  - [x] Confirm TypeDoc links re-exported symbols back to their original source pages
  - [~] If TypeDoc renders barrel pages too noisily:
    - [x] Adjust TypeDoc settings to prefer categories
    - [~] Consider hiding barrel-only pages if they reduce clarity
      - Remaining:
        - Current category grouping is improved and acceptable; hide-barrel tuning can be revisited if docs noise increases.

- [x] Regenerate docs and verify readability
  - [x] `yarn doc`
  - [x] `yarn doc-to-site`
  - [x] `yarn site:build:app`
  - [x] Spot check: verify docs pages for each domain remain navigable and grouped

### 5D: Tests + examples stay in sync

- [x] Update specs that embed import snippets
- [x] Add a small example file per domain under `site/` or `examples/` (whichever is preferred)
  - [x] Each example uses only domain-flat imports
  - [x] Each example is referenced from README

---

## Phase 6: Export Contract Tests (Prevent Regression)


### 5A: Demo site

- [x] Refactor `site/api/index.ts`
  - [x] Replace namespace access patterns:
    - [x] `API.Routing.RouteMap` -> `import type { RouteMap } from "@resistdesign/voltra/api"`
    - [x] `Common.TypeParsing.TypeInfo` -> `import type { TypeInfo } from "@resistdesign/voltra/common"`
    - [x] `TypeInfoORMServiceError` -> import from `@resistdesign/voltra/common`

- [x] Search/replace across `site/`:
  - [x] Replace `import * as API from "@resistdesign/voltra/api"` patterns where they cause nesting pain
  - [x] Replace `API.Routing.` and `Common.TypeParsing.` usage with direct imports

### 5B: README + docs

- [x] Update `README.md` import examples to match the new contract (domain-flat)
  - [x] Keep the “root import unsupported” note intact【49†source】

- [x] Regenerate TypeDoc and site artifacts
  - [x] `yarn doc`
  - [x] `yarn doc-to-site`
  - [x] `yarn site:build:app`

### 5C: Tests

- [x] Update any specs that rely on `* as API/Common` patterns, where it now obscures missing exports
- [x] Add spec(s) that compile a consumer file using only:
  - [x] `@resistdesign/voltra/api`
  - [x] `@resistdesign/voltra/common`
  - [x] `@resistdesign/voltra/web`
  - [x] `@resistdesign/voltra/native`
  - [x] `@resistdesign/voltra/build` (in a build-only test)

---

## Phase 6: Export Contract Tests (Prevent Regression)

### Goal

Make it impossible to reintroduce “can’t import X” problems.

- [x] Expand `scripts/check-package-exports.mjs` and/or add `scripts/export-contract.mjs`
  - [x] Hardcode a list of required imports:
    - [x] `@resistdesign/voltra/api` exports: `RouteMap`, `addRoutesToRouteMap`, `handleCloudFunctionEvent`
    - [x] `@resistdesign/voltra/common` exports: `TypeInfo`, `TypeInfoMap`, `TypeInfoORMServiceError`
    - [x] `@resistdesign/voltra/web` exports: `createWebFormRenderer`, `AutoField`
    - [x] `@resistdesign/voltra/native` exports: `createNativeFormRenderer`
    - [x] `@resistdesign/voltra/build` exports: `getTypeInfoMapFromTypeScript`
  - [x] Run it in CI and locally via `yarn test:exports`

- [x] Add a “no hash files” assertion
  - [x] Fail if `dist/` contains `*-???????.d.ts` or similar hashed patterns

---

## Phase 7: Optional Cleanup (After Everything Works)

- [x] Deprecate namespace exports (soft)
  - [x] Keep them for now, but add doc comments like `@deprecated Prefer importing {RouteMap} from "@resistdesign/voltra/api"`

- [x] Decide what stays grouped (namespaces) vs what stays flat
  - [x] Rule of thumb: if it’s used in README/site demos, it should be flat

---

## Deliverables Checklist

- [x] `@resistdesign/voltra/api` supports `import { RouteMap } from "@resistdesign/voltra/api";`
- [x] `@resistdesign/voltra/common` supports `import { TypeInfo, TypeInfoORMServiceError } from "@resistdesign/voltra/common";`
- [x] `@resistdesign/voltra/build` works and remains explicit opt-in
- [x] No hashed `.d.ts` files in published output
- [x] IDE auto-import suggests only valid public subpaths
- [x] Site + docs + tests updated to the new domain-flat import contract
