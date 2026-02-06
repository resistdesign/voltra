# PLAN — Remove Root Entry (src/index.ts) and Harden Subpath Exports

This plan removes the root barrel entry (`src/index.ts`) to prevent cross-runtime bundling issues, while preserving its documentation content in the correct sub-entrypoints.

Goal:
- Consumers should import **only** via explicit subpath entrypoints (e.g. `@voltra/app`, `@voltra/web`, `@voltra/native`, `@voltra/api`).
- The package should not ship a root runtime entry that can accidentally pull web/native-only code into the wrong runtime.

Non-goals:
- Changing the internal architecture beyond what’s necessary to enforce safe imports.

---

## Phase 0 — Audit Current Root Entry + Consumers

Goal: understand what `src/index.ts` exports today and who consumes it.

- [ ] Review `src/index.ts`:
  - [ ] list all exports it re-exports
  - [ ] identify doc comments that contain important guidance
- [ ] Search the repo for root imports:
  - [ ] `from "@voltra"` / `from "<package-name>"` patterns
  - [ ] internal imports that rely on root barrel
- [ ] Add “Audit Notes” section below:
  - [ ] export list
  - [ ] doc-comment sections to preserve
  - [ ] consumer locations

### Audit Notes

(Fill during execution.)

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
- [ ] Move doc comments into the destination file(s) with minimal edits.
- [ ] Ensure the comments do not imply root imports.
- [ ] Add small “See also” pointers between sub-entrypoints when helpful.

### 1C — Add a Docs Page (If Needed)

If `src/index.ts` contains broad “how to consume this package” info, create/update a docs page:
- [ ] `docs/consumption.md` (or existing docs structure)
- [ ] Include:
  - [ ] recommended import patterns
  - [ ] platform/runtime boundaries
  - [ ] why root import is intentionally unsupported

---

## Phase 2 — Remove Root Runtime Entry

Goal: eliminate root runtime entrypoints.

### 2A — Remove Source + Build Artifacts
- [ ] Delete `src/index.ts`.
- [ ] Ensure no tsup entry builds `src/index.ts` anymore.

### 2B — Update `package.json` Entry Fields
- [ ] Remove or neutralize fields that encourage root import:
  - [ ] `main`
  - [ ] `types`
  - [ ] any root-level `module` / `browser` fields if present

Preferred approach:
- [ ] Remove `main`/`types` entirely if subpath exports are sufficient.
- [ ] Alternatively set them to a safe stub only if tooling demands it.

### 2C — Update `exports`

- [ ] Remove `exports["."]`.
- [ ] Keep only explicit subpath exports (e.g. `./app`, `./web`, `./native`, `./api`).
- [ ] Ensure each export points to platform-safe bundles only.

### 2D — Add a Root Import Fail-Fast (Optional)

If desired, provide a deliberate failure mode for consumers who try to import the root:
- [ ] Do **not** provide a JS entry.
- [ ] Let Node/bundlers fail resolution with a clear message in docs.

If tooling requires a root file, use a tiny file that throws immediately with a clear message, but only if it cannot be avoided.

---

## Phase 3 — Update Internal Imports + Consumers

Goal: the codebase and demos never rely on root import.

- [ ] Update internal references to import from the correct subpath.
- [ ] Update demo apps/examples/tests to use subpath imports.
- [ ] Add a lint/CI guard if possible:
  - [ ] disallow importing the package root

---

## Phase 4 — Tests + Validation

Goal: prevent regressions and ensure runtime safety.

- [ ] Build and test:
  - [ ] `yarn build`
  - [ ] `yarn test`

- [ ] Add a spec (or lightweight check) that validates `package.json`:
  - [ ] root export is absent
  - [ ] required subpath exports exist
  - [ ] emitted files exist under `app/`, `web/`, `native/`, `api/`

- [ ] Add a “smoke import” test per runtime:
  - [ ] importing `@voltra/web` does not reference native modules
  - [ ] importing `@voltra/native` does not reference DOM/window modules

---

## Acceptance Criteria

- [ ] `src/index.ts` is removed.
- [ ] `package.json` does not encourage root imports (`main/types/exports["."]` removed or made safe).
- [ ] Documentation content from `src/index.ts` is preserved in appropriate sub-entrypoints and/or docs.
- [ ] Repo consumers and demos import only via subpaths.
- [ ] Tests/build pass and basic runtime-boundary smoke checks exist.

---

## Execution Notes

- Prefer **breaking loudly** (failed module resolution) over silently bundling the wrong runtime code.
- Keep doc comments concise in entrypoints; move longer guidance to docs pages.
- If any external consumer depends on root import, add a migration note in docs.

---

Next: Phase 0 — Audit current `src/index.ts` and populate “Audit Notes”.

