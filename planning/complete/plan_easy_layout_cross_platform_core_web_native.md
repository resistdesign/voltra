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

- [x] Locate and review:
  - [x] `src/app/utils/EasyLayout.tsx`
  - [x] `src/web/utils/EasyLayout.tsx`
  - [x] Any usage sites (search for `EasyLayout`, `getEasyLayout`, template strings)
- [x] Document in “Audit Notes”:
  - [x] current public API surface (exports, functions, components)
  - [x] template grammar currently supported
  - [x] supported units (fr/px/%/auto?)
  - [x] gap/padding behaviors
  - [x] current error behavior (throw vs fallback)

- [x] Locate and review
- [x] Document in “Audit Notes”

### Audit Notes

- Public API surface (current)
  - `src/app/utils/EasyLayout.tsx` exports:
    - `getPascalCaseAreaName(area)`
    - `getEasyLayoutTemplateDetails(layout)`
    - `createEasyLayout(config, extendFrom?, areasExtendFrom?)`
    - types: `FCWithChildren`, `ComponentMap`, `LayoutComponents`, `EasyLayoutFactoryConfig`
  - `src/web/utils/EasyLayout.tsx` exports:
    - `getEasyLayout(extendFrom?, areasExtendFrom?)` (styled-components web factory)
  - Barrel exports:
    - `src/app/utils/index.ts` exports `./EasyLayout`
    - `src/web/utils/index.ts` exports `./EasyLayout`

- Usage sites (current)
  - In `src/`, usage is concentrated in EasyLayout implementation/tests.
  - Direct repo search shows no additional runtime consumers under `src/` beyond the EasyLayout modules and `src/web/utils/EasyLayout.spec.json`.

- Template grammar currently supported
  - Input is a newline-delimited template string.
  - Row syntax: `<area tokens separated by spaces>, <row track size>`.
    - Example: `header header, 1fr`
  - Column track syntax: a line starting with `\` followed by track list.
    - Example: `\ 100px 1fr`
  - Rows without `, <size>` are accepted; row tracks are optional.
  - Area tokens are split on single spaces after trim/filter.
  - No explicit validation for equal column counts or rectangular areas.

- Supported units (current behavior)
  - Rows/columns are passed through as CSS strings; there is no parser-level unit validation.
  - Existing examples/tests use `fr` and `px`.
  - `%`, `auto`, `minmax(...)`, etc. are likely accepted as pass-through text if provided.

- Gap/padding behaviors (current)
  - No gap or padding parsing/options in EasyLayout core/web helpers.
  - Generated layout CSS only includes:
    - `grid-template-columns` (if `\` line present)
    - `grid-template-areas`
    - `grid-template-rows` (if row tracks were provided)
  - Any gap/padding must be applied externally (e.g., via extended styled component styles).

- Error behavior (current)
  - No explicit throws for malformed templates in parser helpers.
  - Missing/odd lines are mostly ignored via trim/filter behavior.
  - `getPascalCaseAreaName` assumes non-empty segments; malformed names with empty segments could throw at runtime via `a[0]` access.

---

## Phase 1 — Define the Shared Core (Parser + Grid Math)

Goal: a single source of truth for interpreting templates and computing track sizes + area bounds.

### 1A — Core Module Placement
- [x] Create `src/app/utils/easy-layout/` (or `src/utils/easy-layout/` if shared beyond app):
  - [x] `types.ts`
  - [x] `parseTemplate.ts`
  - [x] `computeTracks.ts`
  - [x] `computeAreaBounds.ts`
  - [x] `validateAreas.ts`

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
- [x] Implement/Extract a parser that supports existing template syntax.
  - [x] Parse the area rows (`"a b c"`)
  - [x] Parse track lines for rows/cols
  - [x] Normalize area tokens
  - [x] Ensure consistent grid width per row
- [x] Add tests covering:
  - [x] happy-path templates
  - [x] inconsistent row widths
  - [x] unknown tokens
  - [x] missing track specs (if allowed today)

### 1D — Area Bounds + Validation
- [x] Compute bounds per area:
  - [x] first/last row + col indices
- [x] Validate shapes are rectangles (CSS Grid template-area rule):
  - [x] detect “holes” or L-shapes
  - [x] throw with an actionable error message
- [x] Add tests for:
  - [x] rectangles
  - [x] non-rectangular area throws

### 1E — Track Size Computation (Shared Math)

Goal: convert track specs into pixel sizes given container size.

- [x] Implement `computeTrackPixels({ tracks, totalPx, gapPx, paddingPx })`
  - [x] subtract padding and total gaps from available space
  - [x] resolve `px` tracks
  - [x] resolve `%` tracks
  - [x] distribute remainder by `fr`
  - [x] clamp negative remainder to 0 and document behavior
- [x] Add tests for:
  - [x] mixed px/pct/fr
  - [x] remainder distribution
  - [x] small container edge cases

---

## Phase 2 — Web EasyLayout (CSS Grid) Using Core

Goal: keep web behavior stable, but ensure it uses the same parsing/validation.

### 2A — Refactor Web to Core
- [x] Update `src/web/utils/EasyLayout.tsx` to:
  - [x] call core parser/validator
  - [x] produce CSS Grid styles from parsed template:
    - [x] `gridTemplateAreas`
    - [x] `gridTemplateRows` and `gridTemplateColumns`
    - [x] `gap` handling
    - [x] `padding` handling
- [x] Ensure existing API remains stable unless clearly broken.

### 2B — Web Docs
- [x] Update doc comments:
  - [x] describe supported template grammar
  - [x] describe supported units
  - [x] clarify that Web uses CSS Grid (browser decides final pixel layout)

### 2C — Web Tests
- [x] Add tests that validate:
  - [x] template parsing parity
  - [x] CSS strings produced match expectations for representative templates

---

## Phase 3 — Native EasyLayout (Computed Coords) Using Core

Goal: implement Native grid positioning via computed coordinates.

Native approach:
- Use core to parse + validate + compute track pixels.
- Convert each area’s row/col bounds into `{ left, top, width, height }`.
- Apply those numbers to `position: "absolute"` styles for children.

### 3A — Native API Shape
- [x] Create `src/native/utils/EasyLayout.tsx` exporting a native-friendly API.

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
- [x] Implement:
  - [x] `computeNativeCoords({ width, height, padding, gap })`
  - [x] uses `computeTrackPixels` for rows and cols
  - [x] uses area bounds to sum track sizes + gaps
- [x] Ensure:
  - [x] pixel rounding strategy is consistent (document it)
  - [x] returns stable coords for same inputs

### 3C — Native Rendering Helper (Optional)

If current Web API provides a component that renders areas, provide a parallel helper.

- [x] Implement `NativeEasyLayoutView` that:
  - [x] renders a container `View` with `onLayout`
  - [x] maps children by area name
  - [x] applies computed absolute styles
  - Implemented as a renderer-agnostic helper that accepts injected `ViewComponent` (RN `View` compatible) to avoid hard runtime dependency.

If Voltra already uses a “getEasyLayout()” component mapping pattern, mirror it.

### 3D — Native Differences (Doc Comments Must Be Explicit)

Document prominently:
- [x] Native does **not** use CSS Grid.
- [x] Layout is **computed** from container size.
- [x] If container size changes, layout recomputes.
- [x] `auto` track sizing is not supported (unless implemented).
- [x] Overflows/scrolling are app-controlled (wrap areas in `ScrollView`).

### 3E — Native Tests
- [x] Add tests for:
  - [x] coord computation for a representative template
  - [x] gap/padding effects
  - [x] mixed track units
  - [x] invalid non-rectangular templates throw

---

## Phase 4 — Public Exports + Docs + Examples

Goal: easy adoption without accidental cross-runtime imports.

### 4A — Exports
- [x] Ensure:
  - [x] Web EasyLayout only exports from `@voltra/web`
  - [x] Native EasyLayout only exports from `@voltra/native`
  - [x] Core parser/maths exported from `@voltra/app` (or internal-only if preferred)

### 4B — Documentation
- [x] Add docs section:
  - [x] overview: why EasyLayout exists
  - [x] template syntax examples
  - [x] web usage example
  - [x] native usage example (onLayout + area mapping)
  - [x] differences table (web vs native)

### 4C — Demo / Story (If project has a demo site)
- [x] Add one demo per platform showing:
  - [x] same template rendered on web
  - [x] same template rendered on native

---

## Acceptance Criteria

- [x] Shared core exists for parsing, validation, and track math.
- [x] Web uses core for parsing/validation and continues to render via CSS Grid.
- [x] Native uses core for parsing/validation and renders via computed coords.
- [x] Errors for invalid templates are consistent and actionable.
- [x] Differences are clearly documented in doc comments and docs pages.
- [x] Tests cover core parsing/validation/math and native coord computation.

---

## Execution Notes

- Preserve existing public API shape where possible.
- When uncertain about current behavior, add a test first to lock it in.
- Prefer numeric pixel coords for native styles (avoid % strings).
- Keep units support small and well-documented.

---

Next: Phase 0 — Audit current EasyLayout and populate “Audit Notes”.
