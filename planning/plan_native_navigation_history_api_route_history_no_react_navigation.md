# PLAN — Native Navigation History API (Route + History, No React-Navigation)

This plan adds a **production-grade, Voltra-owned navigation history API** for React Native.

Core principle:

- Native does **not** need an address bar.
- Native needs a **history state machine** with a browser-like API.
- Apps decide **when/how** to use it.

This integrates with Voltra `Route` so screens can render based on the current location.

Non-goals:

- Shipping a full navigation UI framework (tabs/stack components) beyond what `Route` needs.
- Persisting history across sessions (explicitly not desired).

---

## Phase 0 — Audit Current Route + Web History

Goal: mirror what web already does and re-use as much shared code as possible.

- [x] Audit app/web/native Route + adapter behavior
- [x] Capture re-usable pieces and known gaps for native history API

### Audit Notes

- `src/app/utils/Route.tsx` is the shared route core already used by both web and native:
  - `RouteAdapter` currently exposes `getPath`, `subscribe`, optional `push`, optional `replace`.
  - `RouteProvider` reads `adapter.getPath()` once (or `initialPath`) and subscribes for updates.
  - Path matching and params are path-only; no query/hash parsing in route context.
  - `createManualRouteAdapter` exists for non-DOM runtimes and is push/replace-capable, but it is single-value path state (no history stack/index).
- `src/web/utils/Route.tsx` uses a browser adapter with `window.history.pushState/replaceState` + `popstate` listener:
  - `getPath` and notifications use `window.location.pathname` only (search/hash ignored by route layer).
  - A click interceptor resolves relative links and calls `adapter.push`.
  - No explicit exposed history object (length/index/go/back/forward/listen); behavior is implicit through browser APIs.
- `src/native/utils/Route.ts` currently contains navigation-state adaptation helpers, not a native history implementation:
  - `createNavigationStateRouteAdapter` wraps external navigation state container callbacks.
  - It depends on external `getState/subscribe/toPath` and optional `navigate/replace`.
  - There is no deep-link lifecycle API (`start/stop`) and no internal in-memory history state machine.
- `src/common/Routing.ts` contains reusable path composition/matching helpers:
  - `resolvePath` is useful for relative path resolution parity.
  - `getParamsAndTestPath` matches route params on path segments only.
  - Query/hash are not part of current matching semantics.
- Current tests lock only basic adapter/route rendering behavior (`src/web/utils/Route.spec.json`, `src/native/utils/Route.spec.json`):
  - No parity tests exist for browser history stack semantics.
  - No tests exist for native deep-link ingestion, back/forward navigation, location keys, or listener ordering.
- Audit conclusion:
  - Reuse `app/utils/Route.tsx` route rendering/context as-is.
  - Introduce a new shared history controller abstraction, then adapt web and native to it.
  - Native work is net-new (in-memory history + deep-link adapter), not a small extension of current native helpers.

---

## Phase 1 — Define the Shared History Contract

Goal: a platform-agnostic history state machine.

### 1A — Core Types

- [x] Added shared history contract types in `src/app/utils/History.ts`

Recommended minimal types:

```ts
export type HistoryLocation = {
	path: string
	search?: string
	hash?: string
	state?: unknown
	key: string
}

export type HistoryEntry = {
	location: HistoryLocation
}

export type HistoryListener = (location: HistoryLocation) => void

export type HistoryController = {
	location: HistoryLocation
	length: number
	index: number

	push: (path: string, opts?: { state?: unknown; replaceSearch?: boolean }) => void
	replace: (path: string, opts?: { state?: unknown; replaceSearch?: boolean }) => void
	go: (delta: number) => void
	back: () => void
	forward: () => void

	listen: (listener: HistoryListener) => () => void
}
```

Notes:

- Keep `search`/`hash` optional. Native deep-links may include them.
- Always maintain a stable `key` per entry.

### 1B — In-Memory History Implementation

- [x] Implemented `createMemoryHistory` in `src/app/utils/History.ts`

### 1C — Path Parsing / Normalization Helpers

- [x] Added `parseHistoryPath` and `buildHistoryPath` in `src/app/utils/History.ts`
- [x] Added JSON spec coverage in `src/app/utils/History.spec.json`

---

## Phase 2 — Native Deep-Link Adapter (RN Linking)

Goal: adapt RN linking events into the shared history.

### 2A — Adapter Interface

- [x] Added `NativeLinkAdapter` in `src/native/utils/History.ts`

```ts
export type NativeLinkAdapter = {
	getInitialURL: () => Promise<string | null>
	subscribe: (listener: (url: string) => void) => () => void
}
```

-

### 2B — Create Native History

- [x] Implemented `createNativeHistory` in `src/native/utils/History.ts`
- [x] Added native history specs in `src/native/utils/History.spec.json`

Recommended API:

```ts
export type NativeHistoryController = HistoryController & {
	start: () => Promise<void>
	stop: () => void
}

export const createNativeHistory = (opts?: {
	adapter?: NativeLinkAdapter
	initialPath?: string
	onIncomingURL?: "push" | "replace"
	mapURLToPath?: (url: string) => string
}): NativeHistoryController => {}
```

Defaults:

- `initialPath = "/"`
- `onIncomingURL = "replace"` (safer on cold start; prevents duplicate first entry)
- `mapURLToPath` should:
  - strip scheme/host
  - keep path + search + hash

### 2C — Android Back Integration (Optional but Recommended)

Even without a UI navigator, Android has a system back event. We provide an opt-in integration so apps can call it.

- [x] Added `createNativeBackHandler` in `src/native/utils/History.ts`

```ts
export const createNativeBackHandler = (history: HistoryController) => {
	return {
		handle: (): boolean => {
			if (history.index > 0) {
				history.back()
				return true
			}
			return false
		}
	}
}
```

-

---

## Phase 3 — Route Integration on Native

Goal: Route uses `NativeHistoryController` similarly to web.

### 3A — A Shared Route + History Bridge

- [x] Added `createRouteAdapterFromHistory` in `src/app/utils/RouteHistory.ts`

Recommended:

- A shared `RouteProvider` that accepts:
  -

### 3B — Native Route Implementation

- [x] Added `NativeRouteProvider` and `NativeRoute` in `src/native/utils/NativeRoute.tsx`

### 3C — Parity Tests

- [x] Added route-history bridge tests in `src/app/utils/RouteHistory.spec.json`
- [x] Added native route integration tests in `src/native/utils/NativeRoute.spec.json`

---

## Phase 4 — Public Exports + Docs

Goal: make this easy to adopt and hard to misuse.

### 4A — Exports

- [x] Exported shared history + bridge from `src/app/utils/index.ts`
- [x] Exported native history + native route wrappers from `src/native/utils/index.ts`

### 4B — Documentation

- [x] Added package-level and API doc comments in:
  - `src/app/utils/History.ts`
  - `src/app/utils/RouteHistory.ts`
  - `src/native/utils/History.ts`
  - `src/native/utils/NativeRoute.tsx`
- [x] Expanded to reference-grade docs with behavior notes and usage examples:
  - `replaceSearch` semantics in shared history/route bridge
  - `start/stop` lifecycle idempotency in native history
  - URL mapping and path-only route matching expectations

---

## Acceptance Criteria

- [x] Shared platform-agnostic history state machine exists.
- [x] Native deep-link adapter lifecycle exists (`start/stop`) with URL mapping defaults.
- [x] Optional Android back handler helper exists.
- [x] Route can consume native history via shared bridge + native provider.
- [x] Behavior is covered by JSON specs and passes `yarn test`.

---

## Execution Notes

- Prefer extracting shared Route+History glue into a platform-agnostic module.
- Do not introduce React-Navigation.
- Keep lifecycle explicit (`start/stop`) so apps control linking behavior.
- When uncertain about current behavior, add a test first to lock it in before refactoring.

---

Next: Plan complete. Awaiting your review; if approved, move this plan file to `planning/complete/`.
