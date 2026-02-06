# PLAN — EasyLayout Cross-Platform (Core + Web + Native)

This plan establishes EasyLayout as a **cross-platform layout system** with:
- a **shared core** (parsing + grid math + validation)
- a **Web implementation** (CSS Grid)
- a **Native implementation** (computed coords → absolute positioning)

Goal:
- Web and Native should be **reasonably close** in intent and ergonomics.
- They do **not** need to be identical.
- Differences must be **explicit in doc comments** and reflected in types.

---

## Phase 0 — Audit Current EasyLayout (Web + App)

Goal: lock in what exists and what consumers rely on.

- [ ] Locate and review:
  - [ ] `src/app/utils/EasyLayout.tsx`
  - [ ] `src/web/utils/EasyLayout.tsx`
  - [ ] Any usage sites (search for `EasyLayout`, `getEasyLayout`, template strings)
- [ ] Document in “Audit Notes”:
  - [ ] current public API surface (exports, functions, components)
  - [ ] template grammar currently supported
  - [ ] supported units (fr/px/%/auto?)
  - [ ] gap/padding behaviors
  - [ ] current error behavior (throw vs fallback)

### Audit Notes

(Fill during execution.)

---

## Phase 1 — Define the Shared Core (Parser + Grid Math)

Goal: a single source of truth for interpreting templates and computing track sizes + area bounds.

### 1A — Core Module Placement
- [ ] Create `src/app/utils/easy-layout/` (or `src/utils/easy-layout/` if shared beyond app):
  - [ ] `types.ts`
  - [ ] `parseTemplate.ts`
  - [ ] `computeTracks.ts`
  - [ ] `computeAreaBounds.ts`
  - [ ] `validateAreas.ts`

### 1B — Core Types

```ts
export type EasyLayoutTemplate = string

export type TrackUnit =
	| { kind: "fr"; value: number }
	| { kind: "px"; value: number }
	| { kind: "pct"; value: number }

export type TrackSpec = TrackUnit

export type EasyLayoutParsed = {
	areaGrid: string[][]
	rowTracks: TrackSpec[]
	colTracks: TrackSpec[]
	areaNames: string[]
}

export type AreaBounds = {
	name: string
	rowStart: number
	rowEnd: number
	colStart: number
	colEnd: number
}

export type EasyLayoutCore = {
	parsed: EasyLayoutParsed
	bounds: Record<string, AreaBounds>
}
```

Notes:
- Keep units intentionally small and predictable.
- `auto` is out-of-scope unless it already exists today.

### 1C — Template Parsing
- [ ] Implement/Extract a parser that supports existing template syntax.
  - [ ] Parse the area rows (`"a b c"`)
  - [ ] Parse track lines for rows/cols
  - [ ] Normalize area tokens
  - [ ] Ensure consistent grid width per row
- [ ] Add tests covering:
  - [ ] happy-path templates
  - [ ] inconsistent row widths
  - [ ] unknown tokens
  - [ ] missing track specs (if allowed today)

### 1D — Area Bounds + Validation
- [ ] Compute bounds per area:
  - [ ] first/last row + col indices
- [ ] Validate shapes are rectangles (CSS Grid template-area rule):
  - [ ] detect “holes” or L-shapes
  - [ ] throw with an actionable error message
- [ ] Add tests for:
  - [ ] rectangles
  - [ ] non-rectangular area throws

### 1E — Track Size Computation (Shared Math)

Goal: convert track specs into pixel sizes given container size.

- [ ] Implement `computeTrackPixels({ tracks, totalPx, gapPx, paddingPx })`
  - [ ] subtract padding and total gaps from available space
  - [ ] resolve `px` tracks
  - [ ] resolve `%` tracks
  - [ ] distribute remainder by `fr`
  - [ ] clamp negative remainder to 0 and document behavior
- [ ] Add tests for:
  - [ ] mixed px/pct/fr
  - [ ] remainder distribution
  - [ ] small container edge cases

---

## Phase 2 — Web EasyLayout (CSS Grid) Using Core

Goal: keep web behavior stable, but ensure it uses the same parsing/validation.

### 2A — Refactor Web to Core
- [ ] Update `src/web/utils/EasyLayout.tsx` to:
  - [ ] call core parser/validator
  - [ ] produce CSS Grid styles from parsed template:
    - [ ] `gridTemplateAreas`
    - [ ] `gridTemplateRows` and `gridTemplateColumns`
    - [ ] `gap` handling
    - [ ] `padding` handling
- [ ] Ensure existing API remains stable unless clearly broken.

### 2B — Web Docs
- [ ] Update doc comments:
  - [ ] describe supported template grammar
  - [ ] describe supported units
  - [ ] clarify that Web uses CSS Grid (browser decides final pixel layout)

### 2C — Web Tests
- [ ] Add tests that validate:
  - [ ] template parsing parity
  - [ ] CSS strings produced match expectations for representative templates

---

## Phase 3 — Native EasyLayout (Computed Coords) Using Core

Goal: implement Native grid positioning via computed coordinates.

Native approach:
- Use core to parse + validate + compute track pixels.
- Convert each area’s row/col bounds into `{ left, top, width, height }`.
- Apply those numbers to `position: "absolute"` styles for children.

### 3A — Native API Shape
- [ ] Create `src/native/utils/EasyLayout.tsx` exporting a native-friendly API.

Recommended exports:

```ts
export type NativeEasyLayoutOptions = {
	padding?: number
	gap?: number
}

export type NativeEasyLayoutCoords = Record<
	string,
	{ left: number; top: number; width: number; height: number }
>

export const makeNativeEasyLayout = (template: EasyLayoutTemplate) => {
	// returns helpers for runtime measurement
}
```

Also provide a hook:

```ts
export const useNativeEasyLayout = (layout: ReturnType<typeof makeNativeEasyLayout>) => {
	// takes container size from onLayout; returns coords
}
```

### 3B — Coordinate Computation
- [ ] Implement:
  - [ ] `computeNativeCoords({ width, height, padding, gap })`
  - [ ] uses `computeTrackPixels` for rows and cols
  - [ ] uses area bounds to sum track sizes + gaps
- [ ] Ensure:
  - [ ] pixel rounding strategy is consistent (document it)
  - [ ] returns stable coords for same inputs

### 3C — Native Rendering Helper (Optional)

If current Web API provides a component that renders areas, provide a parallel helper.

- [ ] Implement `NativeEasyLayoutView` that:
  - [ ] renders a container `View` with `onLayout`
  - [ ] maps children by area name
  - [ ] applies computed absolute styles

If Voltra already uses a “getEasyLayout()” component mapping pattern, mirror it.

### 3D — Native Differences (Doc Comments Must Be Explicit)

Document prominently:
- Native does **not** use CSS Grid.
- Layout is **computed** from container size.
- If container size changes, layout recomputes.
- `auto` track sizing is not supported (unless implemented).
- Overflows/scrolling are app-controlled (wrap areas in `ScrollView`).

### 3E — Native Tests
- [ ] Add tests for:
  - [ ] coord computation for a representative template
  - [ ] gap/padding effects
  - [ ] mixed track units
  - [ ] invalid non-rectangular templates throw

---

## Phase 4 — Public Exports + Docs + Examples

Goal: easy adoption without accidental cross-runtime imports.

### 4A — Exports
- [ ] Ensure:
  - [ ] Web EasyLayout only exports from `@voltra/web`
  - [ ] Native EasyLayout only exports from `@voltra/native`
  - [ ] Core parser/maths exported from `@voltra/app` (or internal-only if preferred)

### 4B — Documentation
- [ ] Add docs section:
  - [ ] overview: why EasyLayout exists
  - [ ] template syntax examples
  - [ ] web usage example
  - [ ] native usage example (onLayout + area mapping)
  - [ ] differences table (web vs native)

### 4C — Demo / Story (If project has a demo site)
- [ ] Add one demo per platform showing:
  - [ ] same template rendered on web
  - [ ] same template rendered on native

---

## Acceptance Criteria

- [ ] Shared core exists for parsing, validation, and track math.
- [ ] Web uses core for parsing/validation and continues to render via CSS Grid.
- [ ] Native uses core for parsing/validation and renders via computed coords.
- [ ] Errors for invalid templates are consistent and actionable.
- [ ] Differences are clearly documented in doc comments and docs pages.
- [ ] Tests cover core parsing/validation/math and native coord computation.

---

## Execution Notes

- Preserve existing public API shape where possible.
- When uncertain about current behavior, add a test first to lock it in.
- Prefer numeric pixel coords for native styles (avoid % strings).
- Keep units support small and well-documented.

---

Next: Phase 0 — Audit current EasyLayout and populate “Audit Notes”.

