# Universal Client-Side Routing (Web + React Native)

> **Status:** active plan (alpha cleanup + refactor, no deprecations)

## Goals

- One **universal** routing story that “just works” with sensible defaults in:
  - React Native iOS
  - React Native Android
  - React Native Web
  - Normal SPA Web App
- Keep Voltra’s spirit: small, explicit primitives; adapters are composable; defaults are safe.
- Eliminate “web vs native” duplication *internally* while keeping **stable entrypoints**.
- Clean docs/tests/examples so consumers have a single clear way to use routing.

## Non-goals

- Don’t implement full SPA frameworks (nested routes, loaders, etc.).
- Don’t take hard dependencies on Expo or React Navigation.
- Don’t introduce deprecations; remove dead/duplicated surfaces instead.

## Context / Problem Statement

We have accumulated multiple routing modes and entrypoints (`app` / `web` / `native`) with overlapping behavior. In
practice, some combinations already “work” cross-platform, but the mental model and documentation are confusing.

Current pain points:

- Consumers don’t want to juggle platform-specific imports or providers.
- “Sensible defaults” should exist so common cases don’t require boilerplate.
- Advanced cases (deep links, custom adapters, custom history) should remain possible and clearly documented.
- `NativeRouteProvider.initialPath` does not behave as expected in some scenarios (needs a source-level audit + fix).

**Note:** the previously observed “RN Web snap-back” is no longer treated as a primary issue; the refactor is about *
*unification, correctness, and clarity** across all targets.

## Design Principles

- **Single Source of Truth:**
  - If DOM + History API exists → browser URL is truth.
  - If no DOM → memory history is truth, with optional deep-link ingress.
- **Progressive Enhancement:**
  - DOM present → enable URL syncing + back/forward.
  - Native only → no URL syncing, but deep links can still drive navigation.
- **No surprises:**
  - Make all “magic” explicit in docs.
  - Avoid bundling DOM-only code into native bundles.

## Proposed Architecture

### 1) Introduce a platform-detecting “universal history controller”

Enhance `src/native/utils/History.ts` so `createNativeHistory()` becomes **environment-aware**:

- **If DOM exists (RN Web + SPA Web):**
  - Initialize from `window.location` (path + search + hash).
  - Mirror `history.push/replace` into `window.history.pushState/replaceState`.
  - Listen to `popstate` and re-sync memory history when user navigates browser back/forward.
  - Add **no-op guard**: if incoming URL maps to current history location, ignore it.

- **If no DOM (iOS/Android):**
  - Keep existing behavior (memory history + optional link adapter ingress).
  - Add the same no-op guard to prevent redundant replays.

This preserves the existing API while fixing RN Web behavior without requiring consumers to switch providers.

### 2) Make the “universal route” story the default

Keep entrypoints (`/app`, `/web`, `/native`) but reduce them to *thin wrappers* around a single implementation.

- `@resistdesign/voltra/app`
  - Remains the shared core.
  - Gains an **optional auto-provider wrapper** that can detect missing adapter and attach the universal provider.

- `@resistdesign/voltra/web`
  - Becomes a re-export of the universal `Route`/`RouteProvider` (or a tiny wrapper).

- `@resistdesign/voltra/native`
  - `NativeRouteProvider` continues to exist, but now works correctly in RN Web due to DOM-aware
    `createNativeHistory()`.

### 3) Sensible defaults for deep linking

- Keep `NativeLinkAdapter` as the universal ingress contract.
- Default `onIncomingURL` stays `"replace"`.
- Document a recommended adapter implementation for RN using `Linking` (from react-native or expo-linking) **without**
  adding those dependencies to Voltra.

## Public API Shape (target)

### Keep

- `@resistdesign/voltra/app`
  - `Route`, `RouteProvider`, `useRouteContext`
- `@resistdesign/voltra/native`
  - `NativeRouteProvider`, `NativeRoute`, `createNativeHistory`, `NativeLinkAdapter`
- `@resistdesign/voltra/web`
  - `RouteProvider`, `Route`, `createBrowserRouteAdapter`

### Change (behavior only, no breaking signature changes)

- `createNativeHistory()` becomes DOM-aware and URL-syncing when DOM exists.
- `NativeRouteProvider.initialPath` doc clarified: only used when there is no initial URL (or when DOM sync is
  disabled).

### Optional cleanup (alpha-only removal)

- Remove duplicate test-util wrappers that exist only because web/native were split.
- Remove any routing exports that are unused/duplicated and not referenced by examples/tests.

---

## Phase 0 — Inventory + Decision Capture

- [ ] Create a new planning file in `planning/` documenting this refactor (summary + decisions + risk notes).
- [ ] Inventory current routing modules, exports, and where each is used:
  - [ ] `src/app/utils/Route.tsx`, `src/app/utils/RouteHistory.ts`
  - [ ] `src/web/utils/Route.tsx`
  - [ ] `src/native/utils/NativeRoute.tsx`, `src/native/utils/History.ts`
  - [ ] examples + site demo usage
- [ ] Capture current failure modes as reproducible scenarios (RN Web + direct URL load + click nav).

**Exit criteria:** we can point to exact files + a minimal reproduction.

## Phase 1 — Audit + Fix `initialPath` semantics (and URL ingress precedence)

### 1.1 Confirm current behavior in source

Files:

- `src/native/utils/NativeRoute.tsx`
- `src/native/utils/History.ts`

- [ ] Identify exactly where `initialPath` is applied.
- [ ] Identify what overrides it (e.g., `adapter.getInitialURL()`, `start()` ordering).
- [ ] Document the precedence rules as they exist today.

### 1.2 Define the desired precedence rules (alpha can change behavior)

Target rules (sensible defaults):

- [ ] If `adapter.getInitialURL()` yields a usable URL → that wins (deep link / direct launch).
- [ ] Else if `initialPath` is provided → use it.
- [ ] Else → default to `/`.

- [ ] Ensure `initialPath` is not ignored when no incoming URL exists.
- [ ] Add a no-op guard so applying the same path twice is harmless.

### 1.3 Implement + test

- [ ] Adjust `createNativeHistory()` / provider start sequence to honor the precedence rules.
- [ ] Add/update routing specs asserting:
  - [ ] `initialPath` is used when no initial URL exists.
  - [ ] initial URL overrides `initialPath` when provided.
  - [ ] redundant incoming URLs do not cause state churn.

**Exit criteria:** `initialPath` behaves deterministically; rules are documented and tested.

## Phase  (reduce required ceremony)

### 2.1 Decide where auto-provider logic lives

- [ ] Option A (preferred): implement universal auto-provider in `src/app/utils/Route.tsx` (core Route).
- [ ] Option B: add `src/app/utils/UniversalRoute.tsx` and re-export as `Route` from `app`.

Decision constraints:

- Must not import DOM globals at module top level.
- Must not force native bundles to include DOM-only logic.

### 2.2 Implement universal auto-provider

- [ ] If `useRouteContext().adapter` is undefined:
  - [ ] If DOM exists → attach browser adapter.
  - [ ] Else → attach native history adapter (memory + optional link adapter).

Notes:

- Keep `RouteProvider` explicit for advanced users.
- Auto-provider is primarily for the “hello world” and typical usage.

**Exit criteria:**

- `import { Route } from "@resistdesign/voltra/app"` works in all 4 environments without needing provider switching.

## Phase 3 — Entry point cleanup (kill duplication, keep compatibility)

- [ ] Refactor `src/web/utils/Route.tsx` and `src/native/utils/NativeRoute.tsx`:
  - [ ] Reduce to thin wrappers or re-exports around universal implementation.
  - [ ] Remove duplicate logic that is now in universal core.
- [ ] Keep `@resistdesign/voltra/web` and `@resistdesign/voltra/native` entrypoints for compatibility.

**Exit criteria:** minimal platform-specific code; same public API still present.

## Phase 4 — Tests (spec runner) + Consumer smoke

### 4.1 Add dedicated routing specs for routing precedence + invariants

- [ ] Add a new JSON spec (e.g. `src/native/utils/NativeRouteProviderPrecedence.spec.json`):
  - [ ] Assert `initialPath` is applied when no initial URL exists.
  - [ ] Assert initial URL overrides `initialPath` when provided.
  - [ ] Assert redundant incoming URLs are ignored (no-op guard).
  - [ ] Assert adapter push/replace update the current path deterministically.

### 4.2 Update existing native/web route tests to reflect new behavior

- [ ] Update any brittle fixtures that assumed memory-only behavior on web.

### 4.3 Run consumer smoke test

- [ ] `yarn test`
- [ ] `yarn test:consumer`
- [ ] `yarn test:exports`

**Exit criteria:** test suite green; no export regressions.

## Phase 5 — Docs, Examples, Site Demo

### 5.1 Documentation overhaul (no scroll-fest, clear “Who/What/Where/When/Why/How”)

- [ ] Update README routing section:
  - [ ] Recommended default: `@resistdesign/voltra/app` imports.
  - [ ] Explain what auto-provider does.
  - [ ] Explain advanced usage (explicit providers/adapters).
  - [ ] Explain deep links ingress contract.
- [ ] Update TypeDoc comments:
  - [ ] Clarify `initialPath` semantics.
  - [ ] Clarify DOM sync behavior.

### 5.2 Examples

- [ ] Update `examples/` to a single “universal routing” example that runs in:
  - [ ] RN iOS/Android
  - [ ] RN Web
  - [ ] SPA Web

### 5.3 Site demo

- [ ] Update demo routes to use universal imports.
- [ ] Add a “Direct URL load” note and verify demo works when loading nested path.

**Exit criteria:** docs + demo show the *same* recommended approach.

## Phase 6 — Cleanup (alpha hard delete)

- [ ] Remove dead exports and unused routing wrappers.
- [ ] Remove duplicated test-utils that are now unnecessary.
- [ ] Ensure `exports` map still covers compatibility entrypoints.

**Exit criteria:** clean API surface; no deprecated leftovers.

---

## Risk Register

- DOM detection must be **100% safe** in SSR / Node test env.
- Metro + package `exports` interactions: avoid introducing conditional exports that Metro can’t resolve.
- Avoid accidental inclusion of web-only code in native bundles (no top-level `window` references). It *CAN* be
  included, but only if it doesn't break anything.

IMPERATIVE: All code that *CAN* be bundled together MUST be bundled together. We just don't want to break things. But we
MUST keep things simple.

### Cross-Platform Code Risks

- We do not want to include code, in a Normal SPA Web only app, that will break the build or crash at runtime.
- We do not want to include code, in a React Native app, that will break the build or crash at runtime.

The current package export structure is designed to avoid this but the Routing implementation has problems:

- It's incomplete on the native side. (There are nice things that Voltra could just provide as a sensible default, like
  the `linkingAdapter` in the included example.)
- It has *FAR too many* redundant/duplicate exports from App/Native/Web. (This **NEEDS** to be unified and only have
  Cross-Platform breaking code split out into the appropriate barrels. **IF** AND I MEAN **IF AND ONLY IF** any part of
  the Routing even needs to be split out *AT ALL*! It may be the case that *PROPER CHECKS AND GUARDS* are all we need.
  This is TBD as you explore, assess and work.)

## Definition of Done

- Works correctly in all four targets.
- URL sync + back/forward works in RN Web and SPA Web.
- Deep links work via adapter in iOS/Android.
- One clear documented “default” usage path.
- Tests cover the bug regression.
- No deprecations; removed dead/duplicated code.

Next: Implement **Phase 1** (DOM-aware native history) with tests first, then wire docs/examples to the new default.

## Example Of A Working Solution With The Current Architecture

```typescript jsx
import React from 'react';
import * as Linking from 'expo-linking';
import {Route as WebRoute, useRouteContext as useWebRouteContext} from '@resistdesign/voltra/web';
import {NativeRouteProvider, Route, useRouteContext} from '@resistdesign/voltra/native';
import {Platform, Pressable, Text, View} from 'react-native';
import {ThemeProvider} from '@shopify/restyle';
import {DefaultTheme} from './Components/Theming';

const linkingAdapter = {
  getInitialURL: () => Linking.getInitialURL(),
  subscribe: (listener: (url: string) => void) => {
    const subscription = Linking.addEventListener('url', event => listener(event.url));
    return () => subscription.remove();
  },
};

const NavButton = ({label, path}: { label: string; path: string }) => {
  const {adapter} = Platform.OS === 'web' ? useWebRouteContext() : useRouteContext();

  return (
    <Pressable onPress={() => adapter?.push?.(path)}>
      <Text>{label}</Text>
    </Pressable>
  );
};

const HomeScreen = () => (
  <View>
    <Text>Engayge</Text>
    <View>
      <NavButton label="Go to Login" path="/login"/>
      <NavButton label="Go to Sign Up" path="/signup"/>
    </View>
  </View>
);

const LoginScreen = () => (
  <View>
    <Text>Login</Text>
    <View>
      <NavButton label="Back Home" path="/"/>
      <NavButton label="Sign Up" path="/signup"/>
    </View>
  </View>
);

const SignUpScreen = () => (
  <View>
    <Text>Sign Up</Text>
    <View>
      <NavButton label="Back Home" path="/"/>
      <NavButton label="Login" path="/login"/>
    </View>
  </View>
);

const App = () => (
  <ThemeProvider theme={DefaultTheme}>
    {Platform.OS === 'web' ? (
      <WebRoute>
        <WebRoute path="/" exact>
          <HomeScreen/>
        </WebRoute>
        <WebRoute path="/login" exact>
          <LoginScreen/>
        </WebRoute>
        <WebRoute path="/signup" exact>
          <SignUpScreen/>
        </WebRoute>
      </WebRoute>
    ) : (
      <NativeRouteProvider adapter={linkingAdapter} onIncomingURL="replace">
        <Route path="/" exact>
          <HomeScreen/>
        </Route>
        <Route path="/login" exact>
          <LoginScreen/>
        </Route>
        <Route path="/signup" exact>
          <SignUpScreen/>
        </Route>
      </NativeRouteProvider>
    )}
  </ThemeProvider>
);

export default App;
```
