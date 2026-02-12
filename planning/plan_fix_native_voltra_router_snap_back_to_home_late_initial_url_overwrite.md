# Fix Native Router “snap back to home” after navigation (React Native)

## Problem summary
In a React Native app using Voltra’s **native router** (`NativeRouteProvider` + `createNativeHistory`), tapping a link to navigate away from home (e.g. `/login`) briefly shows the target view, then **immediately flips back to home** (`/`).

This strongly suggests that **the initial deep-link resolution is being applied *after* the user has already navigated**, and it’s overwriting the newer navigation state.

## Where the bug likely lives
- `src/native/utils/NativeRoute.tsx`
  - `NativeRouteProvider` calls `history.start()` once on mount.
- `src/native/utils/History.ts`
  - `createNativeHistory().start()`:
    - `await adapter.getInitialURL()`
    - then applies it via `applyIncomingURL(initialURL)` (default mode is `replace`)
    - then subscribes to future links via `adapter.subscribe(...)`

### Why this causes the snap-back
`getInitialURL()` is async and can resolve **after** the app has already rendered and the user has already triggered navigation.

When it resolves late, `applyIncomingURL(initialURL)` runs and (by default) **`replace`s the current entry**—often to `/` if the initial URL is null-ish / maps to fallback / or if the app was opened normally.

So:
1. App starts at `/` (or initialPath)
2. User taps “Login” → history pushes `/login`
3. A moment later `getInitialURL()` resolves → Voltra **replaces** route → back to `/`

## Goals
- Prevent late `getInitialURL()` from overwriting user navigation that happened after `start()` began.
- Preserve current behavior for real deep-link launches.
- Keep `start()` and `stop()` idempotent.
- Don’t break `onIncomingURL: "push" | "replace"` semantics.
- Add tests proving the regression and fix.

---

## Phase 1 — Reproduce + lock-in the failure with a spec test
- [ ] Add a new test helper scenario in `src/native/utils/History.test-utils.ts` that simulates:
  - `adapter.getInitialURL()` resolves **after a delay**
  - user navigates (history.push) **before** the promise resolves
  - current behavior: route ends up overwritten by initialURL
- [ ] Add a corresponding entry in `src/native/utils/History.spec.json` capturing the *expected* fixed behavior.

### Suggested new test scenario (shape)
Create a new exported function, e.g. `runNativeHistoryLateInitialURLDoesNotOverrideScenario`:
- Create `createNativeHistory({ initialPath: "/", adapter: { getInitialURL: () => delayed("voltra://host/"), subscribe: ... } })`
- Call `const startPromise = history.start()` (don’t await immediately)
- Immediately do `history.push("/login")`
- Await `startPromise`
- Expect final location is still `/login` (NOT `/`)

Also include a variant where:
- no user navigation occurs before initialURL resolves
- expect the initialURL is applied (still works for real deep-link launch)

---

## Phase 2 — Implement the fix in native history startup
- [ ] Edit `src/native/utils/History.ts` `start()` lifecycle to avoid overwriting navigation that happens after start begins.

### Implementation constraints
- Must not require consumers to change their app.
- Must work with both `onIncomingURL: "replace"` and `"push"`.
- Must keep `start()` idempotent.

### Recommended fix (state-guard)
Inside `start()`:
1. Capture the “startup state” before awaiting:
   - `const startKey = history.location.key`
   - `const startIndex = history.index`
2. `await adapter.getInitialURL()`
3. Only apply it if history is still at the startup state:
   - apply initialURL **only if** `history.location.key === startKey && history.index === startIndex`

This ensures:
- If the user navigated (push/replace/go) during startup, the late initialURL is ignored.
- If the user did not navigate, initialURL applies normally.

### Also recommended (subscribe order)
Consider subscribing **before** awaiting `getInitialURL()` to avoid missing an incoming URL event during the await.

Ordering suggestion:
- establish `unsubscribe = adapter.subscribe(...)` first
- then await + guard-apply `getInitialURL()`

If you do this:
- Ensure the initialURL doesn’t double-apply if the platform also fires it as an event.
  - If needed, de-dupe by remembering the last applied URL string during startup.

---

## Phase 3 — Update/extend specs and verify
- [ ] Run `yarn test` and confirm the new spec passes.
- [ ] If fixtures are generated rather than hand-authored, run `yarn test:gen` and commit updated expectations.
- [ ] Sanity-check the existing `History.spec.json` expectations still pass (no regressions).

---

## Phase 4 — Documentation / behavior notes
- [ ] Update doc comments in `src/native/utils/History.ts` (near `start()` behavior) to mention:
  - initialURL is applied only if no navigation occurred during startup
  - this prevents late initialURL overriding user navigation
- [ ] Optional: add a short note in docs/site if there is a section on native routing.

---

## Acceptance criteria
- Navigating away from home immediately after app render **does not snap back**.
- Deep-link launch still routes correctly on cold start.
- All tests (`yarn test`) pass.
- Behavior is stable across both `onIncomingURL` modes.

---

## Debugging notes for the agent
- The repro is easiest when `getInitialURL()` is delayed (simulate with a promise + `setTimeout`).
- The overwrite tends to look like a “flash” because it’s a replace on the same history controller.
- The provider (`NativeRouteProvider`) starts history on mount; you don’t need to add additional effects in app code.

