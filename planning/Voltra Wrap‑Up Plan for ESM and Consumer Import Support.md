# Voltra — Wrap‑Up Plan for ESM + Consumer Import Support (for Codex)

This plan is based on the **current branch state** (tsup + `moduleResolution: bundler` + `exports` + `prep-dist.mjs` + consumer smoke test).

## What’s already correct (do not undo)

* `tsconfig.json` uses `"moduleResolution": "bundler"` (prevents `.js` specifiers in TS source).
* `tsup.config.ts` builds **curated entrypoints** into `dist/` (ESM, `.js` output).
* `scripts/prep-dist.mjs` generates `dist/package.json` (publishable, minimal surface).
* `package.json.exports` exposes only:

  * `.` `./api` `./app` `./common` `./iac` `./iac/packs`
* `scripts/consumer-smoke.mjs` runs `npm pack` from `dist/` and validates:

  * approved imports compile
  * deep import (`/iac/packs/dns`) fails

## The remaining problems we must eliminate

### 1) IDE auto‑import must never suggest deep paths

We will *guarantee* this by making deep paths **unresolvable and unshippable**.

Hard guarantees (no editor assumptions):

1. **`package.json.exports` does not include any deep paths** (leaf modules).
2. **Tarball does not contain leaf entrypoints as importable modules** beyond the curated surfaces.

  * Achieved by a strict `files` list + only building/including the curated entrypoint folders.
3. **Types do not expose leaf paths as public import targets.**

  * If leaf `.d.ts` files ship, some IDEs may still surface them in suggestions even if runtime import fails.
  * Therefore we either (a) do not ship leaf `.d.ts` files, or (b) roll up declarations per entrypoint so consumers only see the barrels.

Acceptance checks (editor-agnostic):

* `tsc` in a clean consumer project fails for a deep import like `@resistdesign/voltra/iac/packs/dns`.
* `node` runtime import fails for the same deep path.
* The package tarball does not include `iac/packs/dns.*` as a directly importable module (unless it is intentionally part of the public API, which it is not).

---

# Work Plan

## Phase A — Make the published tarball minimal and intentional

### A1. Change `package.json.files`

Replace the wide `"**/*"` with a strict list (relative to published root = `dist/`):

* `index.js`, `index.d.ts`
* `api/**`, `app/**`, `common/**`, `iac/**`
* `README.md`, `package.json`

Keep the CloudFormation spec exclusions only if they still matter after tightening.

### A2. Ensure `prep-dist.mjs` writes the **tightened** fields

`prep-dist.mjs` currently copies `files` as‑is from root. After A1, running `yarn prep-dist` should produce a strict `dist/package.json`.

### A3. Verify tarball contents

Add (or run locally):

* `cd dist && npm pack --json`
* inspect that the tarball does **not** contain `src/`, `site/`, `scripts/`, or any other internal folders.

Acceptance:

* Tarball contains only built JS + d.ts + README + package.json.

---

## Phase B — Make auto‑imports choose the barrels

### B1. Ensure every “pack” symbol is exported from the barrel

Verify `src/iac/packs/index.ts` exports the exact symbols users want.

### B2. Make leaf modules “non‑entrypoints” in published types

Even with `exports`, TS language service can sometimes offer paths it can see.

Two robust options (choose one):

**Option 1 (preferred): d.ts rollup per entrypoint**
Configure tsup (or an additional type build) so each entrypoint produces a *rolled* `.d.ts` that does not expose the internal module paths as import targets.

* Goal: consumers see types through `@resistdesign/voltra/iac/packs` only.

**Option 2: keep types as-is, rely on strict tarball + exports**
If Phase A eliminates leaf files from the package (or at least eliminates their `.d.ts`), auto‑import can’t target them.

Acceptance:

* In a clean consumer project, VS Code suggests imports from:

  * `@resistdesign/voltra/iac/packs` (or root) — not leaf paths.

---

## Phase C — Confirm runtime + TS correctness for consumers

### C1. Keep and expand `test:consumer`

`scripts/consumer-smoke.mjs` is good. Expand slightly:

* also run a **Node runtime** import test (not just `tsc`) to confirm Node respects `exports`:

  * `node -e "import('@resistdesign/voltra/iac/packs').then(m=>console.log(!!m.addDNS))"`
  * and a deep import that must throw.

Acceptance:

* deep import throws at runtime.

---

## Phase D — CLI bin verification

### D1. Make sure tsup emits the CLI output file

`tsup.config.ts` already has an entry for `common/Testing/CLI` with a shebang banner.

### D2. Add a consumer CLI smoke

In `consumer-smoke.mjs`, after install:

* run `npx vest --help` (or a harmless command) and assert exit code 0.

Acceptance:

* CLI works from a packed install.

---

# CI / Release wiring

* Ensure `release-npm.yml` does:

  * install
  * `yarn build`
  * `yarn test`
  * `yarn test:consumer`
  * publish from `dist/`

---

# Final Acceptance Criteria

1. No `.js` specifiers required in TS source.
2. Consumers import only from curated entrypoints.
3. Deep imports fail at **typecheck** and **runtime**.
4. Tarball contents are minimal and intentional.
5. `vest` CLI works when installed from the tarball.
