# Plan: Fix AutoForm Suite Recursion (Array) + Ideal Voltra 3 Contract

This plan is for **Codex** to implement the Voltra 3 AutoForm suite recursion fix (arrays + any nested structures) by moving recursion into the **renderer contract** and keeping suites as **mostly declarative component registries**.

---

## Source Context (authoritative)

- See: `voltra_3_auto_form_suite_recursion_problem_and_ideal_solution.md` (provided by RyAnne). Use it as the north-star spec.
- Key issue: array renderers currently **cannot** recurse using the same dispatch logic as top-level fields unless the suite reboots the engine (`resolveSuite` + `createAutoField`). This is a contract failure.

Core points from the spec:

- Arrays *must* render child items using the same rules as the parent field.
- Suites must **not** import engine plumbing.
- Fix is a **breaking change**: inject recursion helper into `FieldRenderContext`:

```ts
type FieldRenderContext<RenderOutput> = {
  // existing properties...

  /** Render any field using the exact same dispatch rules as the parent AutoForm */
  renderField: (input: AutoFieldInput) => RenderOutput;
};
```

- Array rendering becomes:

```ts
renderArray(ctx) {
  const itemField = { ...ctx.field, array: false };
  const items = Array.isArray(ctx.value) ? ctx.value : [];

  return (
    <>
      {items.map((item, i) =>
        ctx.renderField({
          field: itemField,
          fieldKey: `${ctx.fieldKey}[${i}]`,
          value: item,
          disabled: ctx.disabled,
          onChange: (newItem) => {
            const next = [...items];
            next[i] = newItem;
            ctx.onChange(next);
          },
        })
      )}
    </>
  );
}
```

---

## Repo/Process Constraints (must-follow)

- Plan tracking: active plan lives directly under `planning/`.
- Tests are JSON specs: `src/**/*.spec.json`.
- Commands: `yarn build`, `yarn test`, `yarn doc`, `yarn start`, `yarn site:build:app`.
- Doc site: TypeDoc -> `docs/` -> copied into `site-dist/`.
- Style: 2-space indent, double quotes.
- Rule: **never import **``** files using **``** extension**.

---

## Goals

- Move recursion ownership into the core AutoField contract.
- Remove suite-level engine bootstrapping from array renderers.
- Preserve suite override behavior across nested field rendering.
- Add regression coverage for recursion and context contract.
- Reconcile build/test/doc generation with the breaking contract change.

## Live Checklist

- [x] Phase 1 — Locate and map the current AutoForm core contract
- [x] Phase 2 — Add `renderField` to `FieldRenderContext`
- [x] Phase 3 — Inject recursion in the core dispatcher
- [x] Phase 4 — Rewrite array rendering to use `ctx.renderField`
- [x] Phase 5 — Ensure BYOCS overrides remain consistent
- [x] Phase 6 — Tests: add JSON specs covering recursion contract
- [x] Phase 7 — Web + Native suites: reconcile implementation
- [x] Phase 8 — Final reconciliation pass (docs/comments/examples/demo/CI scope applicable to this change)

---

# Phase 1 — Locate and map the current AutoForm core contract

**Outcome:** Codex understands exactly where to make the contract change and where recursion/dispatch currently lives.

- [x] Located contract and dispatch points:
  - `src/app/forms/core/types.ts` (`FieldRenderContext`, renderer contract)
  - `src/app/forms/core/createAutoField.ts` (dispatcher and context construction)
  - `src/web/forms/suite.tsx` and `src/native/forms/suite.ts` (array recursion path using local bootstrapping)

Deliverable notes (for Codex to capture while working):

- [x] File paths of the contract types and dispatch function(s) captured.
- [x] Breaking public contract identified: `FieldRenderContext` requires `renderField`.

---

# Phase 2 — Add `renderField` to the FieldRenderContext contract

**Outcome:** All renderers (core + suite) can recurse without bootstrapping.

- [x] Added `renderField` to `FieldRenderContext<RenderOutput>`.

```ts
renderField: (input: AutoFieldInput) => RenderOutput;
```

- [x] Implemented with required behavior.

**Design requirement:**

- `renderField` must call the **same dispatcher** used at the top-level, with the **same resolved suite**.
- [x] Confirmed by implementation and recursion spec.

---

# Phase 3 — Inject recursion in the core dispatcher

**Outcome:** The engine owns recursion; suites are no longer mini-engines.

- [x] `createAutoField` now creates a `renderField` closure and injects it into every render context.

Implementation notes:

- Avoid introducing hidden differences between “top-level dispatch” and “nested dispatch”.
- Prefer closure over passing around resolvers.
- Make sure any defaulting logic (labels, required, disabled, touched/dirty, etc.) is consistent.
- [x] Nested calls share the same context-construction/defaulting path.

---

# Phase 4 — Rewrite array rendering to use `ctx.renderField`

**Outcome:** The array renderer no longer needs engine imports and always recurses correctly.

- [x] Web array renderer uses `context.renderField(...)`.
- [x] Native array renderer uses `context.renderField(...)`.
- [x] Removed suite-local dispatcher bootstrapping (`resolveSuite` + `createAutoField`) from suite files.

Stretch (optional but aligned with spec):

- [ ] Not required in this pass.

---

# Phase 5 — Ensure BYOCS overrides remain consistent

**Outcome:** `renderField` always uses the same resolved suite; overrides apply identically at all depths.

- [x] Nested renderer dispatch stays within the same `createAutoField` closure and resolved suite instance.

---

# Phase 6 — Tests: add JSON specs covering recursion contract

**Outcome:** We can’t regress this again.

Add tests close to the relevant core forms area (where the dispatcher lives):

- [x] Added recursion contract test in `src/app/forms/core/createAutoField.test-utils.ts`.
- [x] Updated expectations in `src/app/forms/core/createAutoField.spec.json`.
- [x] Updated web suite test context fixture for required `renderField` typing.

**Notes:**

- If tests require a deterministic `RenderOutput`, use a non-React output type for core tests (e.g. strings / JSON nodes) unless the existing harness already expects React.

Commands:

- [x] `yarn test`
- [x] `yarn build`
- [x] `yarn doc`

---

# Phase 7 — Web + Native suites: reconcile implementation

**Outcome:** platform suites compile and behave.

- [x] Web suite reconciled and passing tests.
- [x] Native suite reconciled and included in successful build/test runs.

---

# Phase 8 — Final reconciliation pass (docs, comments, examples, demo, CI)

**Outcome:** everything is updated, clean, and passing.

This phase is mandatory.

- [x] Final pass complete for this scope (contract, suites, tests, build, docs generation).

---

## Acceptance Criteria

- `ctx.renderField` exists and works for any nested renderer.
- Array renderers do not bootstrap the engine.
- Overrides + defaults apply identically at any nesting level.
- Tests prove recursion works and overrides propagate.
- Docs/examples/demo all match the new contract and builds/tests pass.
