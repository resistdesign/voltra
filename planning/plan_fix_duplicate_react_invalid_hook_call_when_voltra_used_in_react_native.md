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

- [ ] Move `react` and `react-dom` **out of** `dependencies`.
- [ ] Add `peerDependencies`:
  - `react: ">=18"` (required)
  - `react-dom: ">=18"` (web-only)
  - `react-native: ">=0.7"` (native-only)
- [ ] Add `peerDependenciesMeta`:
  - `react-dom: { optional: true }`
  - `react-native: { optional: true }`
- [ ] Ensure demo tooling still works by keeping runtime React available during repo builds:
  - [ ] Add `react` + `react-dom` to **devDependencies** (if not already present there)
  - [ ] Add `@types/react` to **devDependencies** (currently `@types/react-dom` exists but `@types/react` does not)

**Acceptance:** After install, `node_modules/@resistdesign/voltra/node_modules/react` must not exist in consumers.

## 2) Ensure build output does not bundle React
**File:** `tsup.config.ts`

- [ ] Update the main build config `external` list to include:
  - `react`
  - `react-dom`
  - `react-native`

(Keep bundling for everything else as-is unless this introduces a new issue.)

**Acceptance:** Generated `dist/**` does not inline React code; consumer resolves React from the app.

## 3) Repo-level verification steps
**Local commands (repo):**
- [ ] `rm -rf node_modules dist` (and any lock artifacts if needed)
- [ ] `yarn install`
- [ ] `yarn test:exports`
- [ ] `yarn build`
- [ ] `yarn site:build:app` (ensures Astro demo site still compiles with root devDeps)

**Dependency sanity:**
- [ ] `yarn why react`
  - Expect one resolved React version in the repo install.

## 4) Consumer reproduction + validation
**In a React Native app consuming Voltra:**
- [ ] Reinstall deps (`rm -rf node_modules && yarn install`)
- [ ] Confirm no nested React:
  - `ls node_modules/@resistdesign/voltra/node_modules` should not contain `react`
- [ ] Launch app and verify the hook crash is gone.

## 5) Guardrails so this doesn’t regress
- [ ] Add a small CI/consumer smoke check (or extend existing `scripts/consumer-smoke.mjs`) to assert:
  - no nested `@resistdesign/voltra/node_modules/react`
  - `react` is a peerDependency
- [ ] Add a brief doc note (README or docs) stating:
  - consumers must provide `react`
  - web consumers provide `react-dom`
  - native consumers provide `react-native`

# Implementation Notes
- `peerDependenciesMeta.optional` is correct for `react-dom`/`react-native` because Voltra supports both environments but any given consumer typically installs only one renderer.
- `react` must **not** be optional.

# Done When
- RN consumer no longer crashes with hook dispatcher errors.
- Voltra build + docs site build succeed.
- React is not nested under Voltra in consumer installs.

