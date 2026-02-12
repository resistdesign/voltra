# Plan: Unified Routing (Single `Route` API in `@resistdesign/voltra/app`)

## Intent (Read Carefully)

This refactor intentionally changes the routing API surface.

We are not preserving the current split routing story.
We are simplifying and unifying it.

The goal is a single routing API imported from:

    @resistdesign/voltra/app

Routing should work in:

- React Native iOS
- React Native Android
- React Native Web
- Normal SPA Web App

No deprecations. Alpha product. Delete what we no longer need.

---

## Target Consumer API

```tsx
import {Route} from "@resistdesign/voltra/app";

<Route>
  <Route path="/" exact>
    <HomeScreen/>
  </Route>

  <Route path="/login" exact>
    <LoginScreen/>
  </Route>

  <Route path="/signup" exact>
    <SignUpScreen/>
  </Route>
</Route>
```

Rules:

- A `Route` without `path` is the provider (root only).
- A `Route` with `path` is a matcher (existing behavior preserved).
- Root auto-detects runtime strategy.
- No platform flags required in normal usage.
- Keep escape hatches available for non-ideal environments, but make auto mode the default and expected path.

---

## Working Sample App (Current Split We Are Removing)

This is the current working sample demonstrating the web/native split that we will eliminate.

```tsx
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
  const {adapter} = Platform.OS === 'web'
    ? useWebRouteContext()
    : useRouteContext();

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

The entire split above must disappear.

---

# Architecture Requirements

## Strategy Selection Rules

Root `<Route>` chooses strategy:

1. If DOM + History API exists → Web Strategy
2. Else → Native Strategy

RN Web should follow Web Strategy by default.

Escape hatch policy:

- No explicit `native` prop on `Route`.
- Expose only minimal advanced configuration for exceptional environments (for example custom ingress/history wiring), without requiring platform switching in consumer component trees.

No platform switching in user code.

---

## Startup Precedence Rules

On first render:

1. If link ingress provides initial URL → use it.
2. Else if `initialPath` provided → use it.
3. Else → "/"

Applying the same path twice must be a no-op.

---

# Execution Plan

---

## Progress Checklist

- [x] Phase 1 — Root `<Route>` becomes provider
- [x] Phase 2 — Unified internal adapter
- [x] Phase 3 — Link ingress + `initialPath`
- [x] Phase 4 — Delete old routing surfaces
- [x] Phase 5 — Test coverage
- [x] Phase 6 — Docs + examples + demo
- [x] Phase 7 — Cleanup
- [x] Phase 8 — Examples Curation and Discoverability

## Phase 1 — Root `<Route>` Becomes Provider

- Convert `src/app` Route to dual-role component:
  - If `props.path` is undefined → provider mode.
  - If `props.path` exists → matcher mode (existing logic).
- In provider mode:
  - Create routing adapter via runtime selection.
  - Create context.
  - Provide context to children.
- Ensure nested matching behavior is unchanged.

Deliverable:

- Nested `<Route>` works exactly as today.
- Root `<Route>` no longer requires separate provider component.

---

## Phase 2 — Unified Internal Adapter

Create a single internal adapter factory:

    createUniversalAdapter()

It must:

Web Strategy:

- Use window.history.pushState
- Use window.history.replaceState
- Listen to popstate
- Sync location to internal state

Native Strategy:

- Use memory history
- No DOM references
- Optional link ingress hook

Constraints:

- No top-level DOM globals in shared modules.
- DOM detection must happen inside functions.

Deliverable:

- Both strategies pass identical adapter contract.
- No code duplication between web/native routing.

---

## Phase 3 — Link Ingress + `initialPath`

- Audit current `initialPath` behavior.
- Fix precedence implementation to match rules.
- Ensure no double-apply loops.
- Add explicit unit tests for:
  - initial URL wins
  - fallback to initialPath
  - fallback to "/"
  - no-op on identical path

Deliverable:

- Deterministic startup behavior across platforms.

---

## Phase 4 — Delete Old Routing Surfaces

Remove or flatten:

- `NativeRouteProvider`
- Web-only Route provider
- Duplicated history wrappers

If keeping web/native exports:

- They must re-export unified implementation only.
- No duplicated logic.

Update:

- Barrel exports
- package.json exports map
- TypeDoc entrypoints

Deliverable:

- `@resistdesign/voltra/app` is the single routing import path.

---

## Phase 5 — Test Coverage

Add tests for:

Provider Mode:

- Root Route creates context.
- Nested Route matches correctly.

Web Strategy:

- push updates URL
- replace updates URL
- popstate updates internal route

Native Strategy:

- push updates memory history
- replace updates memory history

Precedence:

- initial URL
- initialPath
- default "/"

All tests must pass in Node environment.

---

## Phase 6 — Docs + Examples + Demo

Update:

README:

- Only show nested `<Route>` usage.
- Explain provider behavior clearly.
- Document strategy detection.
- Document available escape hatches and when they are appropriate.

Examples:

- Remove platform switching.
- Use only `@resistdesign/voltra/app`.

Site demo:

- Load nested routes directly via URL.
- Ensure browser back/forward works.

Progress:

- [x] README updated to unified `@resistdesign/voltra/app` routing usage.
- [x] Examples updated.
- [x] Site demo updated and verified.

---

## Phase 7 — Cleanup

- Remove dead helpers.
- Remove deprecated routing code.
- Remove unused provider components.
- Run full test suite.
- Run consumer tests.
- Run export validation.

---

## Phase 8 — Examples Curation and Discoverability

Intent:

- Treat `examples/` as intentional reference material for consumers.
- Examples do not need to compile or run as integration tests.
- They must be correctly classified, organized, and easy to discover.

Work:

- Reorganize `examples/` by domain (for example: `examples/routing/`, `examples/api/`, `examples/forms/`, `examples/layout/`, `examples/build/`, `examples/common/`).
- Ensure each example file has a clear purpose and naming convention.
- Separate client routing examples from backend API request-routing examples.
- Add a top-level examples index doc (for example `examples/README.md`) with:
  - What each folder covers.
  - Audience (app client, backend API, forms, layout, etc.).
  - Expected usage style (reference snippet vs runnable app).
- Update consumer-facing docs to link to the examples index:
  - Root `README.md`.
  - Relevant TypeDoc-facing module docs/comments where appropriate.
- Ensure routing docs point to routing examples directly (not generic examples list).
- Remove or rewrite low-signal placeholder snippets.

Deliverable:

- Examples are classified and navigable by topic.
- Consumers can find the right examples from top-level docs without guesswork.
- API/backend routing examples are clearly distinct from app/client routing examples.

Progress:

- [x] Examples reorganized by domain folders.
- [x] Top-level examples index added (`examples/README.md`).
- [x] Routing and backend API routing examples separated and documented.
- [x] Consumer-facing docs updated with direct examples links.

---

# Done Means

- The sample app can be rewritten with:
  - No `web` imports for routing.
  - No `native` imports for routing.
- Works in:
  - iOS
  - Android
  - RN Web
  - SPA Web
- Documentation matches implementation.
- No split routing story remains.
- Examples are organized by domain and linked from consumer-facing docs.
