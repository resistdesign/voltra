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

-

### Audit Notes

(Fill during execution.)

---

## Phase 1 — Define the Shared History Contract

Goal: a platform-agnostic history state machine.

### 1A — Core Types

-

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

-

### 1C — Path Parsing / Normalization Helpers

-

---

## Phase 2 — Native Deep-Link Adapter (RN Linking)

Goal: adapt RN linking events into the shared history.

### 2A — Adapter Interface

-

```ts
export type NativeLinkAdapter = {
	getInitialURL: () => Promise<string | null>
	subscribe: (listener: (url: string) => void) => () => void
}
```

-

### 2B — Create Native History

-

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

-

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

-

Recommended:

- A shared `RouteProvider` that accepts:
  -

### 3B — Native Route Implementation

-

### 3C — Parity Tests

-

---

## Phase 4 — Public Exports + Docs

Goal: make this easy to adopt and hard to misuse.

### 4A — Exports

-

### 4B — Documentation

-

---

## Acceptance Criteria

-

---

## Execution Notes

- Prefer extracting shared Route+History glue into a platform-agnostic module.
- Do not introduce React-Navigation.
- Keep lifecycle explicit (`start/stop`) so apps control linking behavior.
- When uncertain about current behavior, add a test first to lock it in before refactoring.

---

Next: Phase 0 — Audit Current Route + Web History and fill “Audit Notes”.

