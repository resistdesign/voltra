# Voltra 3 AutoForm Suites: The Array Recursion Problem & the Ideal API

## Context

Voltra AutoForm uses a **ComponentSuite** to map *field metadata* → *render output*.

- The engine determines a field “kind” (string, number, enum, relation, custom, array, etc.)
- It builds a **FieldRenderContext**
- It calls `suite.renderers[kind](ctx)`

The engine’s *dispatcher* (the thing that can render **any** field) is effectively what `createAutoField(resolvedSuite)` returns.

---

## The Problem (very specific)

### The requirement

An array renderer must render **child items** using the **same** logic as the top-level field rendering.

In other words, inside `renderers.array(ctx)` we need something like:

- “Render this item field with the suite’s dispatch rules”
- “Render this nested field exactly as AutoForm would normally”

### What Voltra exposes today

Suite renderers currently get only the `FieldRenderContext`.

**But the context does not include any recursion capability**, such as:

- `renderField(...)`
- `AutoField(...)`
- `dispatchField(...)`

### What suite authors must do (today)

Because arrays *must* recurse, suite authors are forced to rebuild the dispatcher themselves:

```ts
const resolved = resolveSuite(undefined, customSuite);
const AutoField = createAutoField(resolved);
```

Then array rendering calls `AutoField(...)` for each item.

### Why this is a real API bug

This is not just “slightly ugly.” It’s a **contract failure**:

1. **The suite must import core engine plumbing** (`resolveSuite`, `createAutoField`).
2. **Recursion requires a hidden initialization phase** that suites shouldn’t own.
3. It invites **inconsistent resolution** (fallbacks, defaults) if the suite resolves differently than the main renderer.
4. It encourages copy/paste “bootstrap hacks” across projects.
5. It violates the goal: **consumer’s life should be easy**.

**Key statement:**

> If arrays require recursion, then recursion is part of the renderer contract.

---

## The Ideal Solution (Voltra 3; breaking changes welcome)

### North Star goal

**Boil a Component Suite down to (almost) nothing more than a mapped/named list of components.**

- Voltra core owns recurring semantics and orchestration.
- Suites supply the UI widgets (design system adapter).
- Flexibility is opt-in via explicit overrides/slots, not required boilerplate.

In practice, the ideal suite author experience is:

```ts
export const suite = {
  components: {
    Form,
    Field,
    Label,
    Error,
    TextInput,
    NumberInput,
    Switch,
    Select,
    ArrayField,
    RelationField,
    CustomField,
    Button,
  }
}
```

…and **Voltra renders everything** using internal semantic renderers.

### Principle

Suites should be **pure mappings** (component registry), not mini-engines.

- Suites declare *what components exist*.

- Voltra core decides *how semantics behave* (arrays, options, coercion, defaults, validation timing).

- No suite should ever need to import engine plumbing (`resolveSuite`, `createAutoField`).

- Suites declare how to render a field kind.

- The engine owns dispatch, recursion, suite resolution, defaults.

- Suites get ergonomic helpers that make nested rendering trivial.

### Mandatory core capability: recursion via `ctx.renderField()`

Arrays (and other nested structures) require recursion. Therefore recursion must be part of the renderer contract.

Add a recursion helper to the render context:

```ts
type FieldRenderContext<RenderOutput> = {
  // existing properties...

  /** Render any field using the exact same dispatch rules as the parent AutoForm */
  renderField: (input: AutoFieldInput) => RenderOutput;
};
```

Now an array semantic renderer can render items without rebuilding the engine.

Add a recursion helper to the render context.

```ts
type FieldRenderContext<RenderOutput> = {
  // existing properties...

  /** Render any field using the exact same dispatch rules as the parent AutoForm */
  renderField: (input: AutoFieldInput) => RenderOutput;
};
```

Now array rendering becomes:

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

**Zero bootstrapping. Zero internal imports. Full consistency.**

---

## Voltra-owned semantics (what core should do)

To keep suites as component registries, Voltra core should own recurring semantics:

### 1) Dispatch + recursion

- Core resolves the suite (overrides + defaults) internally.
- Core injects `ctx.renderField` so nested rendering is consistent.

### 2) Arrays as semantics, not userland glue

Core should implement canonical array behaviors:

- add/remove/reorder
- default item creation rules
- empty state logic
- item keying strategy
- item-field derivation (array field → item field)
- consistent validation/errors per item path

Suite provides **one** `ArrayField` component that receives prebuilt props:

- label/required/error
- `items: Array<{ key, element, onRemove, onMove }>`
- `onAdd`

Core generates `items[].element` via `ctx.renderField(...)`.

### 3) Enums/selects

Core should:

- build options from literal unions
- coerce number/string values consistently
- handle required/placeholder semantics

Suite provides a single `Select` component.

### 4) Validation/touched/dirty + error timing

Core should decide:

- when errors appear (on blur / submit / always)
- touched/dirty derivation

Suite displays `error` and status props.

### 5) Relation/custom orchestration

Core should standardize action semantics and payloads. Suite renders shells (`RelationField`, `CustomField`) while the app can opt-in to custom flows via callbacks.

## Default behavior + complete flexibility

### Sensible defaults (always provided)

Voltra should ship robust default semantic renderers using the default suites. A consumer should get a working form with minimal setup.

### Flexibility (opt-in)

Provide explicit, reasonable escape hatches:

1. **Override semantic renderers** (advanced)

```ts
createRenderer({
  suite,
  semanticOverrides: {
    array: (ctx) => ...,
    custom: (ctx) => ...,
  }
})
```

2. **Per-field widget override via tags**

```ts
tags: { widget: "MoneyInput" }
```

Suite can register extra widgets:

```ts
components: { widgets: { MoneyInput, PhoneInput } }
```

3. **Slots instead of full overrides** Allow customizing small parts of semantics:

- `ArrayField` slots: `ItemWrapper`, `EmptyState`, `Footer`
- `RelationField` slots: `Preview`, `Trigger`

This keeps 95% of consumers on the happy path while preserving 100% flexibility.

### Sensible defaults

Voltra should ship a default array UX (add/remove, empty state, item wrapper) that works out of the box.

But:

- suites can override the **visuals**
- apps can override **UX flows** (modals/screens)

### Flexibility knobs

Provide built-in helpers so advanced suites can be fully custom:

- `ctx.renderField(...)` (core recursion)
- `ctx.fieldUtils.itemField(field)` (canonical item-field derivation)
- `ctx.valueUtils.array.ensure(value)` / `ctx.valueUtils.array.update(...)`
- `ctx.actions` for relation/custom types (existing concept)

---

## Optional: Suite factories (nice-to-have)

If desired, suites can be factories to support composition, but this should be optional.

```ts
type SuiteFactory<RenderOutput> = (helpers: {
  defaultSuite: ComponentSuite<RenderOutput>;
}) => ComponentSuite<RenderOutput>;
```

Even with factories, recursion should still be provided through `ctx.renderField` so suite authors never touch engine plumbing.

Instead of raw objects, make the suite a factory that receives engine helpers.

```ts
type SuiteFactory<RenderOutput> = (helpers: {
  renderField: (input: AutoFieldInput) => RenderOutput;
  defaultSuite: ComponentSuite<RenderOutput>;
}) => ComponentSuite<RenderOutput>;
```

This allows suites to:

- close over `renderField`
- reuse default renderers selectively
- compose suites cleanly

But: ``** alone is enough** and is the simplest ideal.

---

## The Voltra 3 Contract (recommended)

### 1) Engine always owns suite resolution

- `create*Renderer(...)` resolves overrides + defaults internally
- suite authors never call `resolveSuite`

### 2) Engine always injects recursion

- `renderField` is provided in context
- all nested rendering uses the same resolved suite

### 3) Suites are declarative

- no top-level initialization
- no importing engine internals

### 4) Defaults are great, overrides are easy

- consumers get a working form instantly
- customization remains 100% possible

---

## Why this is the ideal (summary)

With `ctx.renderField`:

- Consumers never touch `createAutoField` or `resolveSuite`
- Array rendering becomes trivial and consistent
- Suite authoring becomes “declare renderers” only
- Default behavior and fallback behavior can never diverge between top-level and nested fields

**Outcome:** Voltra becomes easier to use, safer to extend, and more future-proof.

