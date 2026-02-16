# Goal
Provide a **single AutoFormView implementation** that works in both **web** and **native** by making the **root form element suite-controlled** (no hardcoded `<form>`), while reusing the existing form engine + suite renderer architecture.

# Current State (code pointers)
- Web-only AutoFormView hardcodes `<form>` via `styled("form")` in `src/web/forms/UI.tsx`.
- Suites already exist for both platforms:
  - Web: `src/web/forms/suite.tsx` exports `webSuite` and `webAutoField`.
  - Native: `src/native/forms/suite.ts` exports `nativeSuite`.
  - Both use the shared core renderer factory: `src/app/forms/core/createFormRenderer.ts`.

# Design Decision
## 1) Add a suite primitive for the root form container
Extend the suite primitive contract to include a **FormRoot** primitive.
- Web default: wraps children in a `<form onSubmit>`.
- Native default: wraps children in a `View`/`ScrollView` (optionally `KeyboardAvoidingView`) and ignores `onSubmit`.

Why this seam:
- Keeps **submit semantics** in shared React component code.
- Keeps **platform container behavior** (DOM form vs RN scroll/keyboard) in suites.

## 2) Build AutoFormView in shared layer; platform barrels re-export
Create `AutoFormView` + `AutoForm` once (shared), but require a renderer (AutoField + suite) so it can use suite primitives.
- Web/native consumers can either:
  - use `createWebFormRenderer()` / `createNativeFormRenderer()` and pass renderer into `AutoFormView` (explicit)
  - or use convenience exports `createWebAutoForm()` / `createNativeAutoForm()` later (optional; not required for this change)

## 3) Avoid duplication
- Do **not** implement separate web/native AutoFormView logic.
- Keep all field rendering as-is (already suite-driven) and only replace the root container + submit button handling.

# API Proposal
## Core primitive additions
In `src/app/forms/core/types.ts`:
- Extend `PrimitiveComponents` with:
  - `FormRoot: PrimitiveComponent<{ children: RenderOutput; onSubmit?: () => void }, RenderOutput>`

Notes:
- Keep `onSubmit?: () => void` (not DOM event) so both platforms can accept it.

## Shared AutoFormView
New file: `src/app/forms/UI.tsx` (or `src/app/forms/react/UI.tsx` if you want to keep React-y things grouped)
- Exports:
  - `AutoFormView` (suite-driven root)
  - `AutoForm` (build controller via `useFormEngine` then render AutoFormView)
- Props:
  - `controller: FormController`
  - `onSubmit: (values: FormValues) => void`
  - `renderer: { AutoField: FC<AutoFieldProps>; suite: ResolvedSuite<ReactElement> }`
  - `submitDisabled?: boolean`
  - `onRelationAction?`, `onCustomTypeAction?`

Implementation sketch:
- `submit()` helper inside component:
  - `if (controller.validate()) onSubmit(controller.values)`
- Use suite primitives:
  - `const FormRoot = renderer.suite.primitives?.FormRoot ?? <fallback>`
  - `const Button = renderer.suite.primitives?.Button ?? <fallback>`
- Render:
  - `<FormRoot onSubmit={submit}> ...fields... <Button type="submit" onClick={submit} disabled={submitDisabled}>Submit</Button> </FormRoot>`

Fallbacks:
- Prefer setting defaults in suites (below) so fallback usage is minimal.

## Web changes
- Update `src/web/forms/suite.tsx`:
  - Provide `primitives.FormRoot` that renders `<form onSubmit>`.
  - Provide `primitives.Button` that renders `<button>` (so AutoFormView uses suite button).
  - (Optional but nice) provide `primitives.Label` too for future usage; not required for this PR.
- Replace `src/web/forms/UI.tsx` with a thin re-export/wrapper:
  - Remove hardcoded `<form>` and `<button>`.
  - Re-export shared `AutoFormView`/`AutoForm` from app layer OR keep web wrapper that imports the shared version.

## Native changes
- Add `src/native/forms/UI.tsx` that re-exports shared `AutoFormView`/`AutoForm`.
- Update `src/native/forms/suite.ts`:
  - Provide `primitives.FormRoot` that renders a RN container.
    - Minimal default: `View` with `style={{ gap: 12 }}`
    - Better default: `KeyboardAvoidingView` + `ScrollView` + inner `View`
  - Provide `primitives.Button` as adapter around existing native `Button` primitive (`./primitives`).
- Update `src/native/forms/index.ts` to `export * from "./UI";`

# Files to Touch
- [x] `src/app/forms/core/types.ts` (add `FormRoot` primitive)
- [x] `src/app/forms/UI.tsx` (new shared AutoFormView/AutoForm)
- [x] `src/app/forms/index.ts` (export the shared UI)
- [x] `src/web/forms/suite.tsx` (add `primitives.FormRoot` + `primitives.Button`)
- [x] `src/web/forms/UI.tsx` (replace with wrapper or re-export shared UI; delete hardcoded form)
- [x] `src/native/forms/suite.ts` (add `primitives.FormRoot` + `primitives.Button`)
- [x] `src/native/forms/UI.tsx` (new wrapper/re-export)
- [x] `src/native/forms/index.ts` (export UI)

# Tests / Acceptance
## Unit
- [x] Update/add tests to ensure:
  - Shared AutoFormView calls `controller.validate()` and only forwards values when valid.
  - Shared AutoFormView omits `hidden` fields.
  - Submit disabled passes to suite Button.

Where to adapt:
- Existing web tests live in `src/web/forms/UI.test-utils.tsx`.
  - Migrate those tests to target the shared AutoFormView, or keep them but import from shared.

## Behavior
- [x] Web:
  - Form submission works via `<form>` submit + button click.
- [x] Native:
  - Rendering does not require DOM components.
  - Button press triggers submit.

# Implementation Notes for Codex
- Keep changes minimal and mechanical.
- Prefer **re-exporting** shared UI rather than duplicating web/native AutoForm code.
- Ensure `createWebFormRenderer()` / `createNativeFormRenderer()` remain unchanged API-wise.
- Avoid introducing new dependencies.

# Clarifications / Updated Requirements
## Suite everywhere
- The requirement is: **everything AutoForm renders (including the root container and submit button)** must come from the supplied **component suite**.
- The current web renderer already uses the suite for fields via the renderer factory; the gap is that **AutoFormView hardcodes the root `<form>` (and sometimes button)** instead of using suite primitives.

## Native default suite
- The `native` barrel should export a **default Native AutoForm suite** (parallel to web) so consumers can simply use it without building primitives first.

## Enter-to-submit (RN web target)
- We need Enter-to-submit to work when the app is running on **web**, even if consumers use the `native` barrel.
- Best seam: implement `nativeSuite.primitives.FormRoot` as **platform-aware**:
  - If `Platform.OS === "web"`: render a real `<form onSubmit>`.
  - Else: render a RN container.
- This avoids duplicating AutoFormView logic and keeps the behavior inside the suite, where platform concerns belong.

## Styling
- Default AutoForm should remain **unstyled bones only**.
- `FormRoot` should provide only structural containment (no spacing/colors). Keyboard/scroll wrappers are optional, but any layout/styling should be minimal and not opinionated.

# Updated Plan Changes
- [x] Ensure AutoFormView uses suite primitives for:
  - Root container (`FormRoot`)
  - Submit control (`Button`)
- [x] Add `FormRoot` primitive to the suite contract.
- [x] Web suite: implement `FormRoot` as `<form>`.
- [x] Native suite: implement `FormRoot` as platform-aware (`<form>` on web, RN container otherwise).
- [x] Export `nativeSuite` (default) from the `native` barrel explicitly as the recommended default suite for AutoForm.

# Out of Scope (explicit)
- Any new opinionated styling system for AutoForm.
- Advanced RN focus management beyond basic Enter-to-submit on web via `<form>`.
