# Goal
Make Voltra client-side routing integrate with **native back navigation** (Android hardware back, iOS “back” semantics where applicable) with:

- **Zero config by default** (works out of the box)
- **Sensible defaults** with **escape hatches**
- **No web regressions** (including RN Web)

Scope: Voltra `Route` / `RouteAdapter` behavior in `app`, plus wrappers in `web` + `native` barrels where appropriate.

---

# What exists today (source map)

## Core (render-agnostic)
- `src/app/utils/Route.tsx`
  - `<Route />` can run in **root provider mode** (auto adapter via `createUniversalAdapter`) or **matcher mode**.
- `src/app/utils/UniversalRouteAdapter.ts`
  - `createUniversalAdapter()` selects:
    - `createBrowserRouteAdapter()` for DOM+History API
    - `createNativeRouteAdapter()` (in-memory history) for non-DOM
  - Native adapter already has an **ingress hook** (`UniversalRouteIngress`) for deep links.
- `src/app/utils/History.ts`
  - Platform-agnostic in-memory history with `back()`, `go(delta)`, `index`, etc.

## Web barrel
- `src/web/utils/Route.tsx`
  - `RouteProvider` auto-creates browser adapter.

## Native barrel
- `src/native/utils/History.ts`
  - `createNativeHistory()` (memory history + deep-link lifecycle)
  - `createNativeBackHandler(history)` (consumes back if `history.index > 0`)
- `src/native/utils/Route.ts`
  - Adapters/utilities to map nav state -> `RouteAdapter` and build paths.

**Key finding:** Voltra already has the right primitives for back handling (`HistoryController.back`, `history.index`) and even a helper (`createNativeBackHandler`) — but the universal/native route adapter **does not auto-wire** Android BackHandler events into the history stack.

---

# Design decision
We want **automatic** native back integration without forcing consumers to adopt react-navigation.

## Proposed behavior
1. **Android hardware back press**:
   - If Voltra history has a previous entry (`history.index > 0`), consume the event and call `history.back()`.
   - Otherwise, return `false` so the OS handles it (exit app / pop native screen if present).

2. **iOS**:
   - There is no hardware back event.
   - If the app is inside a native navigation controller (react-navigation), the native stack’s swipe-back will work *independently*.
   - Voltra should not break anything; it may expose a programmatic `back()` helper for UI back buttons.

3. **Web / RN Web**:
   - Do **not** intercept browser back.
   - Browser history already works through `createBrowserRouteAdapter()`.

## Where to implement
We need an implementation that:
- is **automatic** for apps that simply use `<Route />` root provider mode
- does **not** introduce hard dependencies on `react-native` for web/node builds

**Approach:** add an *optional* Android back integration inside `createNativeRouteAdapter()` using **dynamic require** guarded by runtime detection.

---

# Implementation plan

## Phase 1 — Move the “back consumption” logic to the correct layer
The logic in `src/native/utils/History.ts#createNativeBackHandler` is not RN-specific; it’s purely `HistoryController`.

- [ ] Move `createNativeBackHandler(history)` from `src/native/utils/History.ts` to `src/app/utils/History.ts` (rename to something platform-agnostic, e.g. `createHistoryBackHandler`).
  - [ ] Keep old export in `src/native/utils/History.ts` as a **re-export** (or alias) for compatibility.
  - [ ] Update any internal imports accordingly.

**Result:** `app` layer can use the helper without importing from `native`.


## Phase 2 — Add Android BackHandler wiring to the universal native adapter
Edit `src/app/utils/UniversalRouteAdapter.ts` in `createNativeRouteAdapter`.

### 2A. Add a tiny runtime probe + dynamic import
- [ ] Add helper `tryGetReactNativeBackHandler()`:
  - Must be safe in non-RN environments.
  - Implementation shape:
    - `try { const rn = require('react-native'); ... } catch { return undefined; }`
    - Validate `rn.BackHandler?.addEventListener` exists.
    - Validate `rn.Platform?.OS === 'android'`.

### 2B. Start/stop lifecycle tied to adapter subscriptions
`createNativeRouteAdapter` already tracks `subscribers` to start/stop ingress.

- [ ] Add `stopBackHandler` similar to `stopIngress`.
- [ ] When `subscribers === 1`:
  - [ ] register `hardwareBackPress` listener.
  - [ ] listener should:
    - call `createHistoryBackHandler(history).handle()` (or inline equivalent)
    - return that boolean.
- [ ] When `subscribers === 0`:
  - [ ] remove the listener.

### 2C. Ensure no duplication / no regressions
- [ ] Make sure multiple `<Route />` roots in the same app don’t register multiple handlers unexpectedly.
  - **Rule:** in typical apps there is one root.
  - If multiple roots exist, each one may register; mitigate by:
    - [ ] tying lifecycle to active subscription count (already done)
    - [ ] ensuring handler is removed on unmount/unsubscribe


## Phase 3 — Provide programmatic back affordance (optional but recommended)
To enable on-screen back buttons in a Voltra-style component suite:

- [ ] Extend `RouteAdapter` type in `src/app/utils/Route.tsx` to include optional navigation helpers:
  - [ ] `back?: () => void`
  - [ ] `canGoBack?: () => boolean`

- [ ] Update `createRouteAdapterFromHistory(history)` in `src/app/utils/RouteHistory.ts` to include:
  - [ ] `back: history.back`
  - [ ] `canGoBack: () => history.index > 0`

- [ ] Update `createBrowserRouteAdapter()` to include:
  - [ ] `back: () => window.history.back()`
  - [ ] `canGoBack: () => window.history.length > 1`

- [ ] Update `createNativeRouteAdapter()` to passthrough these extras from its internal history adapter.

**Why:**
- Improves ergonomics for custom back buttons.
- Keeps hardware back handling internal, but still offers flexibility.


## Phase 4 — Tests

### 4A. Unit tests for history back consumption helper
- [ ] Add test coverage in existing history test harness:
  - Create memory history with multiple pushes.
  - Verify handler returns `true` and history moves back when `index > 0`.
  - Verify handler returns `false` at index 0.

### 4B. Unit tests for BackHandler registration lifecycle (mock RN)
In `src/app/utils/UniversalRouteAdapter.test-utils.ts` add a scenario that:

- [ ] Temporarily defines a global `require` shim or injects a `globalThis.__voltra_require__` hook (preferred) so the adapter can dynamically import a mocked `react-native` module.
  - If dynamic import is implemented with `require('react-native')`, tests need a way to provide that module.

- [ ] Mock shape:
  - `Platform: { OS: 'android' }`
  - `BackHandler.addEventListener(event, cb)` returns `{ remove() {} }` (or compat API)
  - Capture the callback.

- [ ] Steps:
  - Create native adapter (`strategy: 'native'`).
  - Subscribe once → assert listener registered.
  - Push a few routes.
  - Invoke captured callback → assert path changes to previous route.
  - Unsubscribe → assert listener removed.

**Note:** If mocking `require` is too messy in the current test harness, implement a tiny injectable hook inside `UniversalRouteAdapter.ts` for tests only:
- e.g. `setUniversalAdapterRuntime({ reactNative: ... })` in `*.test-utils.ts` builds.


## Phase 5 — Docs + examples
- [ ] Update `examples/routing/*` (or add one) showing:
  - Root `<Route />` works with Android hardware back automatically.
  - Optional UI back button using `useRouteContext().adapter?.back?.()`.

- [ ] Update any README/API docs that mention `createNativeRouteAdapter` / universal routing.

---

# Acceptance criteria
- [ ] Android hardware back navigates Voltra route history when possible.
- [ ] When Voltra cannot go back, OS handles back (exits app or pops native screen).
- [ ] iOS build does not regress; no crashes; routing still works.
- [ ] Web build does not regress; browser back continues to work as before.
- [ ] No required consumer config for the default case.

---

# Files to edit (expected)
- `src/app/utils/History.ts`
- `src/native/utils/History.ts`
- `src/app/utils/UniversalRouteAdapter.ts`
- `src/app/utils/Route.tsx` (RouteAdapter type extension)
- `src/app/utils/RouteHistory.ts`
- `src/app/utils/UniversalRouteAdapter.test-utils.ts` (+ any needed harness helpers)
- (docs/examples) `examples/routing/*`, `README.md` if applicable

