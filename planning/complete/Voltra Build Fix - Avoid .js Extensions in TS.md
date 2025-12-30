# Voltra Build Fix: Avoid `.js` Extensions in TS (Bundled Publish + `exports`)

## Progress

- [x] Phase 0 — Inventory & constraints
- [x] Phase 1 — Switch dev/typecheck resolution to Bundler
- [x] Phase 2 — Add bundler build for publish artifacts
- [x] Phase 3 — Fix published `package.json` (exports + types)
- [x] Phase 4 — Fix CLI `bin`
- [x] Phase 5 — Add consumer smoke tests
- [x] Phase 6 — Docs updates
- [x] Phase 7 — Build/pack/test/verify

## Problem

Current build uses TS `moduleResolution: NodeNext/Node16` semantics for ESM output. That mode enforces **Node ESM fully‑specified imports**, which requires `.js` extensions in relative imports *in source*.

We do **not** want to litter TypeScript source with `.js` import specifiers.

## Target

* Keep TS source imports extensionless (`./foo`, not `./foo.js`).
* Publish a package that works in Node ESM (and optionally CJS).
* Maintain curated public entrypoints (root + selected subpaths) so IDE auto‑imports do not suggest deep internal file paths.

## Strategy (industry‑standard)

Use a **bundler build** for publish output and switch TS to `moduleResolution: "bundler"` for developer/typecheck.

Bundler options (pick one; prefer simplest):

* **tsup (recommended)**: fast, minimal config, emits ESM/CJS and `.d.ts`.
* rollup / unbuild: fine but heavier.

Publishing then uses `package.json.exports` to expose only curated entrypoints.

---

## Phase 0 — Inventory & Constraints (Codex must confirm)

1. Identify current compile target expectations:

  * Is Voltra intended to be **ESM‑only** or **dual (ESM+CJS)**?
  * Does the CLI `bin` need CJS compatibility?
2. Identify current publish mechanism:

  * Is publishing done from `dist/` (tarball contains `dist/package.json`)?
  * Are there scripts copying `package.json` into `dist/`?
3. Confirm desired public entrypoints:

  * `@resistdesign/voltra`
  * `@resistdesign/voltra/api`
  * `@resistdesign/voltra/app`
  * `@resistdesign/voltra/common`
  * `@resistdesign/voltra/iac`
  * `@resistdesign/voltra/iac/packs`

---

## Phase 1 — Switch dev/typecheck resolution to Bundler

### 1.1 Update TypeScript config used for editing/typecheck

In the main `tsconfig.json` (or base), set:

* `"moduleResolution": "bundler"`
* `"module": "ESNext"` (or compatible)
* ensure `"verbatimModuleSyntax": true` (if already used) remains consistent

This removes the `.js` extension requirement during TS authoring.

### 1.2 Add a dedicated build config (if needed)

Create/adjust `tsconfig.build.json` for d.ts generation compatibility if using bundler:

* Either let tsup emit d.ts (`--dts`) or run `tsc -p tsconfig.build.json --emitDeclarationOnly`.

---

## Phase 2 — Add bundler build for publish artifacts

### 2.1 Add tsup

Add dev dependency:

* `tsup`

Create `tsup.config.ts` with:

* explicit entrypoints for curated surfaces
* ESM output (and optional CJS)
* `.d.ts` generation
* clean output

**Entrypoints should map to source barrel files** (index.ts):

* `src/index.ts`
* `src/api/index.ts`
* `src/app/index.ts`
* `src/common/index.ts`
* `src/iac/index.ts`
* `src/iac/packs/index.ts`

Important: we are bundling *per entrypoint*, not creating one mega bundle that breaks tree‑shaking.

### 2.2 Update package scripts

* `build`: runs tsup
* (optional) `build:types`: runs tsc emit declarations if not using tsup dts

### 2.3 Ensure output layout is stable

Expected `dist/`:

* `dist/index.(mjs|js)` and `dist/index.d.ts`
* `dist/api/index.(mjs|js)` and `dist/api/index.d.ts`
* ...

No `dist/src/**` paths should be exposed as public imports.

---

## Phase 3 — Fix published `package.json` (exports + types)

### 3.1 Ensure the published manifest is correct

If publishing from `dist/`, a build step must write/copy a **sanitized** `package.json` into `dist/`.

### 3.2 Define `exports` to prevent deep imports

Add `exports` that includes ONLY the curated entrypoints.

Example (ESM‑only):

* `.` → `./index.mjs` (or `./index.js` if type=module)
* `./iac` → `./iac/index.mjs`
* `./iac/packs` → `./iac/packs/index.mjs`
* etc.

Example (dual):

* provide `import` + `require` entries for each export.

### 3.3 Types mapping

For each `exports` entry, include `types` pointing to the `.d.ts` file.

### 3.4 Enforce “no deep imports”

Do **not** export paths like:

* `./iac/packs/dns`

Once `exports` is present, IDEs/TS should stop suggesting these.

---

## Phase 4 — Fix CLI `bin`

If the package exposes a CLI (e.g. `vest`):

* ensure `bin` points at a built file in `dist/`
* if dual output, pick a CJS file for `bin` (most compatible) OR keep CLI separate as CJS

Codex must verify:

* `npm pack` includes the bin target
* `npx <bin>` works in a consumer sandbox

---

## Phase 5 — Add consumer smoke tests (prevents regressions)

Create `test/consumer/` (or `examples/consumer/`) that:

1. Runs `npm pack` in repo
2. Installs the tarball into the consumer folder
3. Runs `tsc` on a small TS file importing:

  * `@resistdesign/voltra`
  * `@resistdesign/voltra/iac`
  * `@resistdesign/voltra/iac/packs`
4. Asserts that a deep import fails:

  * `@resistdesign/voltra/iac/packs/dns`

This makes it impossible to accidentally re‑expose internal paths.

---

## Phase 6 — Docs updates

Update README to show supported patterns:

* Preferred: subpath entrypoints (`@resistdesign/voltra/iac/packs`)
* Convenience: namespace (`IaC.Packs.addDNS`)
* Not supported: deep internal file imports

---

## Phase 7 — Build/Pack/Test/Verify

Run and confirm:

* `yarn build`
* `yarn test`
* `yarn test:consumer`
* `yarn site:build:api`
* `yarn site:build:iac` (requires `REPO_OWNER`, `REPO_NAME`, `REPO_BRANCH`, `REPO_TOKEN`)
* `yarn site:build:app`

---

## Acceptance Criteria

* `yarn build` succeeds without adding `.js` extensions in TS source.
* Packaged install works:

  * Root import works
  * Curated subpath imports work
  * Deep internal imports fail
* VS Code auto‑import suggests only curated entrypoints.

---

## PR Breakdown

1. **Bundler + TS config**

* add tsup + config
* set `moduleResolution: bundler`
* update build scripts

2. **Published package manifest**

* ensure dist/package.json has correct `exports`, `types`, `bin`

3. **Consumer smoke test**

* add pack/install/tsc test

4. **Docs**

* README import guidance
