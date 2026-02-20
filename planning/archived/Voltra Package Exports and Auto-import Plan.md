# Voltra Package Exports + Auto‑Import Plan (for Codex)

## Progress

- [x] Phase 1 — Build layout PR
- [x] Phase 2 — Exports PR
- [x] Phase 3 — Tooling guardrails PR (optional)
- [x] Phase 4 — Docs PR

## Goal

Make IDE/TS auto‑imports prefer **public package entrypoints** (root + curated subpaths) instead of deep file paths.

Concrete user experience targets:

* ✅ Allowed:

  * `import { IaC } from "@resistdesign/voltra";` then `IaC.Packs.addDNS`
  * `import { Packs } from "@resistdesign/voltra/iac";` then `Packs.addDNS`
  * `import { addDNS } from "@resistdesign/voltra/iac/packs";`
* ❌ Not allowed (or at least not *auto‑suggested* by IDEs):

  * `import addDNS from "@resistdesign/voltra/iac/packs/dns"`
  * Any other deep internal path import that ties users to repo structure.

## Why this is happening

Today the repo exposes source‑like paths (and/or publishes a structure that makes internal modules reachable), so IDEs/TS can resolve symbols to specific files and then propose those deep imports.

The standard fix is to:

1. **Define the public surface** with `package.json.exports` (and types mapping).
2. **Ship build output that matches those entrypoints**.
3. Optionally enforce with lint rules + a consumer “import test”.

---

## Current inventory (what Codex must verify in repo)

### A) Entry modules that should exist

* `src/index.ts` (root entry; exports `API`, `App`, `IaC`, `Common` namespaces)
* `src/api/index.ts`
* `src/app/index.ts`
* `src/common/index.ts`
* `src/iac/index.ts`
* `src/iac/packs/index.ts`

### B) Current build/publish behavior

* Release workflow publishes from `dist/`.
* `tsc` emits into `dist/`.
* `dist/package.json` is copied from root and version patched.

**Risk:** The shipped `dist/package.json` currently lacks:

* `exports`
* `main` / `types` (or equivalent)
* explicit ESM/CJS intent
* correct `bin` target

Codex must treat this work as: **“make the package actually have a deliberate module surface”**.

---

## Decision: What import style do we want to optimize for?

### Recommendation (best of both worlds)

Support *both* patterns, but optimize ergonomics and tooling:

1. **Curated subpath entrypoints** (best for tree‑shaking & common ecosystem norms)

  * `@resistdesign/voltra` (root)
  * `@resistdesign/voltra/api`
  * `@resistdesign/voltra/app`
  * `@resistdesign/voltra/common`
  * `@resistdesign/voltra/iac`
  * `@resistdesign/voltra/iac/packs`

2. **Namespace style remains supported**

  * `import { IaC } from "@resistdesign/voltra";`
  * `IaC.Packs.addDNS`

3. **Disallow deep imports**

  * Anything beyond the curated entrypoints should be blocked via `exports`.

This makes IDE auto‑imports pick one of the allowed entrypoints.

---

## Phase 1 — Reshape build output to match package entrypoints

### 1. Create a dedicated TS build config

Create `tsconfig.build.json`:

* `rootDir: "src"`
* `outDir: "dist"`
* `declaration: true`
* `declarationMap: true` (optional but helpful)
* `emitDeclarationOnly: false`
* `include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js"]`
* `exclude`: specs + `site/**`

**Resulting output layout should be:**

* `dist/index.js` + `dist/index.d.ts`
* `dist/api/index.js` + `dist/api/index.d.ts`
* `dist/iac/index.js` + `dist/iac/index.d.ts`
* `dist/iac/packs/index.js` + `dist/iac/packs/index.d.ts`
* etc.

### 2. Update `package.json` scripts

* `build` should compile using `tsc -p tsconfig.build.json`.
* If the docs site needs compilation, create separate scripts:

  * `build:site` (Astro)
  * `build:api` etc

### 3. Fix the CLI `bin` target

The published `bin` must point at a compiled JS file.

* After Phase 1 layout change, the compiled CLI should be at:

  * `dist/common/Testing/CLI.js` (or similar)
* Update `bin.vest` in the **published** package.json to reference the built file.

Codex must confirm:

* `npm pack` includes the compiled bin target.
* `npx vest ...` works from a consumer sandbox.

---

## Phase 2 — Define the public module surface (package exports)

### 1. Add `exports` to the published `package.json`

The package should explicitly export only:

* `.`
* `./api`
* `./app`
* `./common`
* `./iac`
* `./iac/packs`

Everything else is intentionally private.

#### ESM‑only vs dual ESM/CJS

Codex must decide based on repo intent:

**Option A: ESM‑only (simpler, modern)**

* Add `"type": "module"` to published `package.json`.
* `exports` uses `"default"` or `"import"` conditions.
* Document “ESM required”.

**Option B: Dual (ESM + CJS) (broader compatibility)**

* Requires emitting both formats (ex: `tsup`, `rollup`, or dual `tsc` builds).
* `exports` provides `import` and `require` entries.

Default plan: start with **Option A** unless the project explicitly needs CJS consumers.

### 2. Types for each entrypoint

Each export should map types:

* root: `dist/index.d.ts`
* subpaths: `dist/<path>/index.d.ts`

If needed for older TS behavior, add `typesVersions`.

### 3. Prevent deep path import resolution

Once `exports` is set, Node/TS tooling should reject:

* `@resistdesign/voltra/iac/packs/dns`

That directly addresses the auto‑import issue.

---

## Phase 3 — Improve auto‑import preferences (optional but high impact)

### 1. “Top‑level re‑exports” for popular symbols

If you want auto‑import to prefer root imports:

* Ensure popular public items are exported from `src/index.ts` and/or the curated entrypoints.

Example:

* `src/iac/index.ts` already exports `Packs`.
* `src/iac/packs/index.ts` exports all packs.

### 2. Add lint rule to block internal imports in repo + consumers

* Add ESLint rule (or `eslint-plugin-import/no-internal-modules`) configured to allow only curated entrypoints.
* Even if IDE suggests a deep path, lint fails.

### 3. Provide a “consumer smoke test” project

Add a small `test/consumer/` (or `examples/consumer/`) that:

* installs the packed tarball (`npm pack` output)
* compiles a TypeScript file that imports ONLY allowed entrypoints
* verifies deep import fails

This protects against regressions.

---

## Phase 4 — Update docs + README import guidance

Update README and/or TypeDoc package docs to show:

### Preferred

* `import { IaC } from "@resistdesign/voltra";`
* `import { Packs } from "@resistdesign/voltra/iac";`
* `import { addDNS } from "@resistdesign/voltra/iac/packs";`

### Not supported

* Deep imports beyond curated entrypoints.

Also add a short rationale:

* stable public API surface
* better refactor safety
* better bundling and tooling

---

## Acceptance Criteria

### Packaging / publishing

* `npm pack` produces a tarball containing:

  * `dist/index.js` + `dist/index.d.ts`
  * the curated subpath entrypoints
  * working `bin` target
* `npm publish` from `dist/` works and the installed package is importable.

### Import surface

* ✅ `import { IaC } from "@resistdesign/voltra"` works.
* ✅ `import { Packs } from "@resistdesign/voltra/iac"` works.
* ✅ `import { addDNS } from "@resistdesign/voltra/iac/packs"` works.
* ❌ `import addDNS from "@resistdesign/voltra/iac/packs/dns"` fails (by design).

### IDE auto‑import sanity check

In VS Code:

* typing `addDNS` should suggest importing from `@resistdesign/voltra/iac/packs` (or from root if re-exported intentionally), not a deep file path.

---

## Suggested PR Breakdown

1. **Build layout PR**

  * add `tsconfig.build.json`
  * update scripts
  * ensure dist output has no `src/` prefix
  * fix `bin` target

2. **Exports PR**

  * add `exports` + `types` mapping to published `package.json`
  * decide ESM-only vs dual and implement

3. **Tooling guardrails PR (optional)**

  * add lint rule blocking deep imports
  * add consumer smoke test

4. **Docs PR**

  * update README + TypeDoc docs with the supported import patterns

---

## Implementation Notes / Gotchas

* Publishing from `dist/` means the `dist/package.json` is the source of truth; make sure the build step writes the correct `exports`, `type`, `bin`, etc into `dist/package.json`.
* If you keep Astro/site tooling, ensure it does *not* pollute the published output.
* If you choose ESM‑only, confirm TS/Node resolution across Node 18/20/22/24 (consumer side). If you need broader reach, implement dual builds.
