# PLAN — Remove Root Entry (src/index.ts) and Harden Subpath Exports

This plan removes the root barrel entry (`src/index.ts`) to prevent cross-runtime bundling issues, while preserving its documentation content in the correct sub-entrypoints.

Goal:
- Consumers should import **only** via explicit subpath entrypoints (e.g. `@resistdesign/voltra/app`, `@resistdesign/voltra/web`, `@resistdesign/voltra/native`, `@resistdesign/voltra/api`).
- The package should not ship a root runtime entry that can accidentally pull web/native-only code into the wrong runtime.

Non-goals:
- Changing the internal architecture beyond what’s necessary to enforce safe imports.

---

## Phase 0 — Audit Current Root Entry + Consumers

Goal: understand what `src/index.ts` exports today and who consumes it.

- [x] Review `src/index.ts`:
  - [x] list all exports it re-exports
  - [x] identify doc comments that contain important guidance
- [x] Search the repo for root imports:
  - [x] `from "@voltra"` / `from "<package-name>"` patterns
  - [x] internal imports that rely on root barrel
- [x] Add “Audit Notes” section below:
  - [x] export list
  - [x] doc-comment sections to preserve
  - [x] consumer locations

### Audit Notes

Export list from `src/index.ts`:
- `export * as API from "./api";`
- `export * as App from "./app";`
- `export * as IaC from "./iac";`
- `export * as Common from "./common";`

Doc-comment sections to preserve:
- API section: routing cloud/RPC back-end requests, with usage and example.
- App section: front-end application guidance with `getEasyLayout`/state loader example.
- IaC section: `SimpleCFT` + packs/utilities usage guidance and example.
- Common section: shared utilities usage guidance.

Root-import consumer locations:
- `scripts/consumer-smoke.mjs`: root import (`import { IaC } from "@resistdesign/voltra";`).
- `README.md`: root import example currently uses `import {IaC} from "@resistdesign/voltra";`.
- `package.json`: root entry wiring exists via `main`, `types`, and `exports["."]`.
- No internal `src/` runtime imports from `@resistdesign/voltra` root were found.
- No `@voltra` root import pattern usage was found.

---

## Phase 1 — Preserve Documentation Content (Move to Correct Places)

Goal: retain the informational content of `src/index.ts` without keeping the root runtime entry.

### 1A — Identify Documentation Targets

For each doc-comment section in `src/index.ts`, decide the most correct destination:
- Web-only guidance → `src/web/index.ts`
- Native-only guidance → `src/native/index.ts`
- App/shared guidance → `src/app/index.ts`
- API/server guidance → `src/api/index.ts`
- If the content is conceptual/project-wide → docs page (and keep a short pointer comment in the most relevant sub-entrypoint)

### 1B — Move and Adapt Comments
- [x] Move doc comments into the destination file(s) with minimal edits.
- [x] Ensure the comments do not imply root imports.
- [x] Add small “See also” pointers between sub-entrypoints when helpful.

### 1C — Add a Docs Page (If Needed)

If `src/index.ts` contains broad “how to consume this package” info, create/update a docs page:
- [x] `README.md` (existing docs structure)
- [x] Include:
  - [x] recommended import patterns
  - [x] platform/runtime boundaries
  - [x] why root import is intentionally unsupported

---

## Phase 2 — Remove Root Runtime Entry

Goal: eliminate root runtime entrypoints.

### 2A — Remove Source + Build Artifacts
- [x] Delete `src/index.ts`.
- [x] Ensure no tsup entry builds `src/index.ts` anymore.

### 2B — Update `package.json` Entry Fields
- [x] Remove or neutralize fields that encourage root import:
  - [x] `main`
  - [x] `types`
  - [x] any root-level `module` / `browser` fields if present

Preferred approach:
- [x] Remove `main`/`types` entirely if subpath exports are sufficient.
- [ ] Alternatively set them to a safe stub only if tooling demands it.

### 2C — Update `exports`

- [x] Remove `exports["."]`.
- [x] Keep only explicit subpath exports (e.g. `./app`, `./web`, `./native`, `./api`).
- [x] Ensure each export points to platform-safe bundles only.

### 2D — Add a Root Import Fail-Fast (Optional)

If desired, provide a deliberate failure mode for consumers who try to import the root:
- [x] Do **not** provide a JS entry.
- [x] Let Node/bundlers fail resolution with a clear message in docs.

If tooling requires a root file, use a tiny file that throws immediately with a clear message, but only if it cannot be avoided.

---

## Phase 3 — Update Internal Imports + Consumers

Goal: the codebase and demos never rely on root import.

- [x] Update internal references to import from the correct subpath.
- [x] Update demo apps/examples/tests to use subpath imports.
- [x] Add a lint/CI guard if possible:
  - [x] disallow importing the package root

---

## Phase 4 — Tests + Validation

Goal: prevent regressions and ensure runtime safety.

- [x] Build and test:
  - [x] `yarn build`
  - [x] `yarn test`

- [x] Add a spec (or lightweight check) that validates `package.json`:
  - [x] root export is absent
  - [x] required subpath exports exist
  - [x] emitted files exist under `app/`, `web/`, `native/`, `api/`

- [x] Add a “smoke import” test per runtime:
  - [x] importing `@voltra/web` does not reference native modules
  - [x] importing `@voltra/native` does not reference DOM/window modules

---

## Phase 5 — Modernize Index Usage Examples

Goal: ensure usage examples in subpath index files match current exports and runtime boundaries.

- [x] Audit usage examples in:
  - [x] `src/api/index.ts`
  - [x] `src/app/index.ts`
  - [x] `src/iac/index.ts`
  - [x] `src/common/index.ts`
- [x] Replace stale symbols/usages with current public API usage.
- [x] Ensure each example uses explicit subpath import patterns only.
- [x] Ensure examples are copy-paste plausible for current TypeScript users.
- [x] Run verification for docs/example consistency:
  - [x] `yarn test`
  - [x] `yarn test:exports`

---

## Acceptance Criteria

- [x] `src/index.ts` is removed.
- [x] `package.json` does not encourage root imports (`main/types/exports["."]` removed or made safe).
- [x] Documentation content from `src/index.ts` is preserved in appropriate sub-entrypoints and/or docs.
- [x] Repo consumers and demos import only via subpaths.
- [x] Tests/build pass and basic runtime-boundary smoke checks exist.
- [x] Usage examples in subpath index files reflect current exports and recommended patterns.

---

## Execution Notes

- Prefer **breaking loudly** (failed module resolution) over silently bundling the wrong runtime code.
- Keep doc comments concise in entrypoints; move longer guidance to docs pages.
- If any external consumer depends on root import, add a migration note in docs.

---

Next: Await user confirmation to close this plan and move it to `planning/complete/`.
