# PLAN — Form Engine + Web/Native Component Suites + BYOCS

This plan upgrades Voltra’s auto-form system into a **platform-agnostic Engine + pluggable Component Suite** architecture.

Deliverables:
- **Core**: shared form rendering glue with strict contracts (no UI hard-coding)
- **Default Web suite**: production-quality out-of-the-box components
- **Default Native suite**: production-quality out-of-the-box components
- **BYOCS**: user-provided component suites with safe composition + strict resolution
- **Exports**: stable package entrypoints for web + native
- **Docs + Tests**: updated TypeDoc and JSON spec coverage

Non-goals:
- Rewriting the Engine unless audits show it violates separation.
- Building an app-specific design system; defaults should be good but not “the only way”.

---

## Working Rules

- **Plan order is mandatory.**
- Each phase must be completed (including tests/docs for that phase) before moving on.
- If a phase reveals necessary scope changes, update this plan before proceeding.

---

## Phase 0 — Audit & Inventory (Reality Check)

Goal: understand what exists today so the refactor is precise and avoids regressions.

- [x] Locate and review the current form subsystem files:
  - [x] `src/app/forms/UI.tsx`
  - [x] `src/app/forms/Primitives.ts`
  - [x] `Engine` and any related controller/types
  - [x] `AutoField` and any relational/custom UI helpers it uses
- [x] Produce an internal mapping table (in this plan, under “Audit Notes”) of:
  - [x] every hard-coded UI element in `AutoField`
  - [x] what semantic intent it represents (candidate `FieldKind`)
  - [x] what additional actions/callbacks it needs (relation management, custom type editor, etc.)
- [x] Identify what is truly “core” vs “web-only”:
  - [x] core (platform-agnostic) logic
  - [x] web-only primitives/components
  - [x] implicit platform assumptions (DOM events, HTML ids, etc.)
- [x] Confirm Engine separation:
  - [ ] Engine does not import React
  - [x] Engine does not render JSX
  - [x] Engine exposes normalized field state + change handlers

### Audit Notes

Mapping table (AutoField hard-coded UI):

| Hard-coded UI element | Semantic intent (candidate FieldKind) | Actions/callbacks |
| --- | --- | --- |
| `FieldWrapper` + `<label>` + `Manage` button for `field.typeReference && field.array` | `relation_array` | `onRelationAction({ action: "open", fieldKey, field, fullPaging, onChange })` |
| `FieldWrapper` + `<label>` + `Manage` button for `field.typeReference && !field.array` | `relation_single` | `onRelationAction({ action: "open", fieldKey, field, fullPaging, onChange })` |
| `FieldWrapper` + `<label>` + list of items + `Manage`/`Remove` + `Add Item` for `customType && field.array` | `custom_array` | `onCustomTypeAction({ action: "edit" | "remove" | "add", fieldKey, field, customType, value, index, onChange })` |
| `FieldWrapper` + `<label>` + value preview + `Manage` for `customType && !field.array` | `custom_single` | `onCustomTypeAction({ action: "open", fieldKey, field, customType, value, onChange })` |
| `FieldWrapper` + `<label>` + `ArrayContainer` with nested `AutoField` + `Remove`/`Add Item` for `field.array` primitives | `array` | `onChange` with updated array values |
| `FieldWrapper` + `<label>` + `<input type="text">` for `string` | `string` | `onChange(e.target.value)` |
| `FieldWrapper` + `<label>` + `<input type="number">` for `number` | `number` | `onChange(parseNumberValue)` |
| Checkbox + label for `boolean` | `boolean` | `onChange(e.target.checked)` |
| `<input list>` + `<datalist>` for selectable values with `allowCustomSelection` | `enum_select` (custom allowed) | `onChange` with string/number |
| `<select>` with options for selectable values without custom | `enum_select` | `onChange` with string/number |
| `<ErrorMessage>` | Field validation feedback | `error` prop |

Core vs web-only notes:
- Core logic currently in `src/app/forms/Engine.ts`, but it imports React hooks (`useState`, `useMemo`, `useCallback`), so it is not platform-agnostic yet.
- UI primitives in `src/app/forms/Primitives.ts` are web-only (styled DOM elements).
- `AutoField`/`AutoForm` in `src/app/forms/UI.tsx` are web-only (DOM inputs, labels, buttons, datalist/select, HTML ids).

Engine separation check:
- Engine does not render JSX.
- Engine *does* import React hooks, so separation is partial; it is tied to React runtime.

---

## Phase 1 — Define the New Core Contracts

Goal: create the **shared types + glue** that make renderers/suites possible.

### 1A — Core Types
- [ ] Add core types in a platform-agnostic location (prefer `src/forms/core/` or equivalent):
  - [ ] `FieldKind`
  - [ ] `FieldRenderContext`
  - [ ] `FieldRenderer`
  - [ ] `ComponentSuite`
  - [ ] `ResolvedSuite`
  - [ ] Optional: minimal primitive components contract (Label, FieldWrapper, ErrorMessage, Button)
- [ ] Add TypeDoc comments for all public types.

### 1B — Field Kind Resolution
- [ ] Implement `getFieldKind(field: TypeInfoField): FieldKind`
  - [ ] Ensure it is the **only** semantic-to-kind mapping location
  - [ ] Add tests for kind resolution across:
    - [ ] primitives (string/number/boolean)
    - [ ] enum/selectable fields
    - [ ] arrays
    - [ ] type references (relations)
    - [ ] custom types

### 1C — Suite Resolution
- [ ] Implement `resolveSuite(overrides, fallback): ResolvedSuite`
  - [ ] Merge override renderers/components over fallback
  - [ ] Throw if any `FieldKind` renderer is missing after merge
  - [ ] Optionally: provide a helpful error listing missing kinds
- [ ] Add JSON spec tests for suite resolution:
  - [ ] override a single renderer
  - [ ] override primitives only
  - [ ] missing renderer throws with clear message

---

## Phase 2 — Refactor AutoField Into Pure Delegation

Goal: `AutoField` must contain **no hard-coded UI**.

### 2A — Create the AutoField Factory
- [ ] Implement `createAutoField(resolvedSuite)`
  - [ ] It builds `FieldRenderContext`
  - [ ] It computes `kind = getFieldKind(field)`
  - [ ] It calls `suite.renderers[kind](ctx)`
  - [ ] It has no UI imports (no web/native primitives)

### 2B — Replace Existing AutoField Usage
- [ ] Update existing web form renderer wiring so it uses the new `createAutoField`
- [ ] Ensure no old hard-coded UI remains reachable
- [ ] Update tests to validate:
  - [ ] correct renderer selection by kind
  - [ ] context values (label, required, disabled, error, value)

---

## Phase 3 — Introduce Web Default Suite (Production-Quality)

Goal: ship a coherent default Web suite that matches current behavior, but now lives behind the suite API.

### 3A — Web Suite Structure
- [ ] Create `src/app/forms/suite.ts` exporting `webSuite: ComponentSuite`
- [ ] Move/organize web primitives into `src/app/forms/primitives/` (or keep current files but adapt cleanly)
- [ ] Implement renderers for all `FieldKind` values using web primitives:
  - [ ] string
  - [ ] number
  - [ ] boolean
  - [ ] enum_select
  - [ ] array
  - [ ] relation_single
  - [ ] relation_array
  - [ ] custom_single
  - [ ] custom_array

### 3B — Relational & Custom Rendering Hooks
- [ ] Replace any embedded relation-management UI with suite-driven behavior:
  - [ ] relation renderers emit actions via `onRelationAction(payload)`
  - [ ] custom renderers emit actions via `onCustomTypeAction(payload)`
- [ ] Define payload types (core, not web-specific):
  - [ ] `RelationActionPayload` (add/remove/select/open/search/etc.)
  - [ ] `CustomTypeActionPayload` (open editor, add/remove item, etc.)
- [ ] Ensure the defaults provide a sane UX:
  - [ ] minimal buttons/controls
  - [ ] predictable behavior
  - [ ] no hidden side effects

### 3C — Web Suite Tests
- [ ] Add JSON spec tests for:
  - [ ] renderer exists for every kind
  - [ ] a few representative renderers produce expected props/callback usage patterns (component-level tests can be minimal; focus on contract correctness)

---

## Phase 4 — Introduce React Native Default Suite (Production-Quality)

Goal: add a native suite without touching Engine/core logic.

### 4A — Native Suite Files
- [ ] Create `src/native/forms/suite.ts` exporting `nativeSuite: ComponentSuite`
- [ ] Create native primitives folder `src/native/forms/primitives/`

### 4B — Native Renderers
- [ ] Implement renderers for the full `FieldKind` set.
  - [ ] Use RN primitives: `TextInput`, `Switch`, `Pressable`, etc.
  - [ ] Keep layout simple and reliable
  - [ ] Avoid assuming any third-party UI kit

### 4C — Native Action Hooks
- [ ] Use the same `onRelationAction` / `onCustomTypeAction` payloads
- [ ] Ensure parity with web actions at the contract level

### 4D — Native Suite Tests
- [ ] Add JSON spec tests verifying suite completeness + basic wiring

---

## Phase 5 — Public API Surface (Factories + Entry Points)

Goal: clean, stable imports for consumers.

### 5A — Renderer Factory
- [ ] Implement `createFormRenderer({ fallbackSuite, suite? })`
  - [ ] returns `{ AutoField, Form, ... }` (include only what exists today; don’t invent extras)
  - [ ] uses `resolveSuite()` internally

### 5B — Web/Native Convenience APIs
- [ ] Export helpers:
  - [ ] `createWebFormRenderer({ suite? })`
  - [ ] `createNativeFormRenderer({ suite? })`
- [ ] Ensure BYOCS works by passing partial overrides

### 5C — Package Exports + Build
- [ ] Add native entrypoint barrel:
  - [ ] `src/native/index.ts` (or `src/native/forms/index.ts` depending on existing patterns)
- [ ] Update `tsup.config.ts` to build the new entrypoint
- [ ] Update `package.json`:
  - [ ] add `exports["./native"]`
  - [ ] add `files` entries for emitted native output

### 5D — Export Consistency Tests
- [ ] Add a spec that asserts the expected export surface exists (pattern used elsewhere in repo)

---

## Phase 6 — Documentation (TypeDoc + Guides)

Goal: make this understandable and usable for engineers.

- [ ] Add/expand TypeDoc on:
  - [ ] core types
  - [ ] suite resolution
  - [ ] renderer factory
  - [ ] action payloads
- [ ] Add a docs page (or update existing docs) that covers:
  - [ ] the mental model (Engine vs Suite)
  - [ ] web usage example
  - [ ] native usage example
  - [ ] BYOCS example (override 1 renderer + 1 primitive)
  - [ ] how to implement relations/custom editors via action hooks
- [ ] Run `yarn doc` and ensure docs generation is clean.

---

## Phase 7 — Migration & Cleanup

Goal: remove dead paths and keep repo tidy.

- [ ] Remove or deprecate old direct-web-only exports if they conflict
- [ ] Update internal imports to use new core layer consistently
- [ ] Ensure no duplicated logic between web/native suites beyond necessary UI differences
- [ ] Run:
  - [ ] `yarn build`
  - [ ] `yarn test`

---

## Acceptance Criteria

- [ ] Engine remains platform-agnostic and does not render UI
- [ ] `AutoField` contains **no hard-coded UI** and only delegates to suite renderers
- [ ] Default Web suite covers all `FieldKind` values and works out-of-the-box
- [ ] Default Native suite covers all `FieldKind` values and works out-of-the-box
- [ ] BYOCS supports partial overrides with strict completeness enforcement
- [ ] `package.json` exports allow clean imports for web and native
- [ ] Tests cover kind resolution, suite resolution, and core glue behavior
- [ ] Documentation explains the model and usage patterns clearly

---

## Execution Notes

- Keep changes tightly scoped to forms.
- If relational/custom UI currently has complex behavior, preserve behavior first, then improve UX in a follow-up plan.
- When encountering unclear existing behavior, add a spec first to lock it in before refactoring.

---

Next: Phase 0 — Audit & Inventory (locate current Engine/AutoField files and build the mapping table).
