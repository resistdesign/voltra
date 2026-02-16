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

-

---

# Phase 1 — Locate and map the current AutoForm core contract

**Outcome:** Codex understands exactly where to make the contract change and where recursion/dispatch currently lives.

-

Deliverable notes (for Codex to capture while working):

- File paths of the contract types and dispatch function(s).
- The minimum set of public types that need a breaking change.

---

# Phase 2 — Add `renderField` to the FieldRenderContext contract

**Outcome:** All renderers (core + suite) can recurse without bootstrapping.

-

```ts
renderField: (input: AutoFieldInput) => RenderOutput;
```

-

**Design requirement:**

- `renderField` must call the **same dispatcher** used at the top-level, with the **same resolved suite**.

---

# Phase 3 — Inject recursion in the core dispatcher

**Outcome:** The engine owns recursion; suites are no longer mini-engines.

-

Implementation notes:

- Avoid introducing hidden differences between “top-level dispatch” and “nested dispatch”.
- Prefer closure over passing around resolvers.
- Make sure any defaulting logic (labels, required, disabled, touched/dirty, etc.) is consistent.

---

# Phase 4 — Rewrite array rendering to use `ctx.renderField`

**Outcome:** The array renderer no longer needs engine imports and always recurses correctly.

-

Stretch (optional but aligned with spec):

-

---

# Phase 5 — Ensure BYOCS overrides remain consistent

**Outcome:** `renderField` always uses the same resolved suite; overrides apply identically at all depths.

-

---

# Phase 6 — Tests: add JSON specs covering recursion contract

**Outcome:** We can’t regress this again.

Add tests close to the relevant core forms area (where the dispatcher lives):

-

**Notes:**

- If tests require a deterministic `RenderOutput`, use a non-React output type for core tests (e.g. strings / JSON nodes) unless the existing harness already expects React.

Commands:

-

---

# Phase 7 — Web + Native suites: reconcile implementation

**Outcome:** platform suites compile and behave.

-

---

# Phase 8 — Final reconciliation pass (docs, comments, examples, demo, CI)

**Outcome:** everything is updated, clean, and passing.

This phase is mandatory.

-

---

## Acceptance Criteria

- `ctx.renderField` exists and works for any nested renderer.
- Array renderers do not bootstrap the engine.
- Overrides + defaults apply identically at any nesting level.
- Tests prove recursion works and overrides propagate.
- Docs/examples/demo all match the new contract and builds/tests pass.

