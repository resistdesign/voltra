# Goal
Eliminate "Invalid hook call" / `dispatcher is null` crashes by ensuring Voltra never ships/installs its own copy of React, and by ensuring the build output does not bundle React.

# Context / Symptoms
- React Native consumer shows stack paths like:
  - `node_modules/@resistdesign/voltra/node_modules/react/...`
- Runtime errors:
  - `Invalid hook call`
  - `TypeError: Cannot read property 'useRef' of null` (dispatcher is null)

# Root Cause
`@resistdesign/voltra` currently lists `react` and `react-dom` in **dependencies** (single-package repo). That allows a nested React install under the library, and tsup bundling can also pull React into dist.

# Constraints
- Voltra remains **one big package** (no sub-packages).
- Demo site has **no separate package.json**.
- No RN demo exists.

# Plan

## 1) Package.json dependency model
**File:** `package.json`

- [x] Move `react` and `react-dom` **out of** `dependencies`.
- [x] Add `peerDependencies`:
  - `react: ">=18"` (required)
  - `react-dom: ">=18"` (web-only)
  - `react-native: ">=0.7"` (native-only)
- [x] Add `peerDependenciesMeta`:
  - `react-dom: { optional: true }`
  - `react-native: { optional: true }`
- [x] Ensure demo tooling still works by keeping runtime React available during repo builds:
  - [x] Add `react` + `react-dom` to **devDependencies** (if not already present there)
  - [x] Add `@types/react` to **devDependencies** (currently `@types/react-dom` exists but `@types/react` does not)

**Acceptance:** After install, `node_modules/@resistdesign/voltra/node_modules/react` must not exist in consumers.

## 2) Ensure build output does not bundle React
**File:** `tsup.config.ts`

- [x] Update the main build config `external` list to include:
  - `react`
  - `react-dom`
  - `react-native`

(Keep bundling for everything else as-is unless this introduces a new issue.)

**Acceptance:** Generated `dist/**` does not inline React code; consumer resolves React from the app.

## 3) Repo-level verification steps
**Local commands (repo):**
- [x] `rm -rf node_modules dist` (and any lock artifacts if needed)
- [x] `yarn install`
- [x] `yarn test:exports`
- [x] `yarn build`
- [x] `yarn site:build:app` (ensures Astro demo site still compiles with root devDeps)

**Dependency sanity:**
- [x] `yarn why react`
  - Expect one resolved React version in the repo install.

## 4) Consumer reproduction + validation
**In a React Native app consuming Voltra:**
- [x] Reinstall deps (`rm -rf node_modules && yarn install`)
- [x] Confirm no nested React:
  - `ls node_modules/@resistdesign/voltra/node_modules` should not contain `react`
- [x] Launch app and verify the hook crash is gone.
- [x] `yarn link` consumer validation (publish-shaped link from `dist/`):
  - linked `@resistdesign/voltra` from `dist/` into `/tmp/voltra-link-consumer`
  - verified `SAME_REACT_INSTANCE=true` between consumer and Voltra resolution
  - verified `NESTED_REACT_PRESENT=0`
  - ran SSR smoke with `@resistdesign/voltra/native` (`SSR_RENDER_OK=true`)

Notes:
- Attempted isolated RN-style consumer install in `/tmp/voltra-rn-consumer-XErOLp/consumer` using local packed tarball from `dist/`.
- Local environment could not complete a reliable fresh RN consumer install due package-manager resolver/network issues while fetching transitive registry dependencies.
- Runtime app launch validation was accepted as deferred by user; if any issue appears later, it will be handled in a follow-up plan.

## 5) Guardrails so this doesn’t regress
- [x] Add a small CI/consumer smoke check (or extend existing `scripts/consumer-smoke.mjs`) to assert:
  - no nested `@resistdesign/voltra/node_modules/react`
  - `react` is a peerDependency
- [x] Add a brief doc note (README or docs) stating:
  - consumers must provide `react`
  - web consumers provide `react-dom`
  - native consumers provide `react-native`

## Remaining
- None.

# Implementation Notes
- `peerDependenciesMeta.optional` is correct for `react-dom`/`react-native` because Voltra supports both environments but any given consumer typically installs only one renderer.
- `react` must **not** be optional.

# Done When
- RN consumer no longer crashes with hook dispatcher errors.
- Voltra build + docs site build succeed.
- React is not nested under Voltra in consumer installs.
