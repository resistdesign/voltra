# Feature: Typed Application State Loader Return Props

## Problem:

Right now, `ApplicationStateValueController` `onChange` supports receiving a value of type `ApplicationStateValue` which
resolves to type `any`.

## Solution:

The `ApplicationStateValueController` needs support the following, key, important features:

1. `onChange` needs to be timeless. Meaning it's like a `useState` setter in React and doesn't need to be claimed as a
   dependency to other
   hooks because it will never be another instance and does not change.
2. `onChange` needs to accept a state "applier" function that supplies the previous value as an argument, just like a
   React `useState`
   setter.
3. `value` needs to have a Type based on an optional type applied to the `identifier: ApplicationStateIdentifier` passed
   to
   `useApplicationStateValue`.

To achieve this, a few things might need to happen:

1. The way `useApplicationStateValue` interacts with the `ApplicationStateContext` may need to fundementally change so
   that `ApplicationStateValueController` `onChange` ends up being and actual `useState` setter somehow. But maybe not.
2. `getApplicationStateIdentifier` will need some way to have a TypeScript generic applied to it, that
   `useApplicationStateValue` can detect and use. This could be challening given that `getApplicationStateIdentifier`
   just returns a unique object *AND* supports nesting.

## Affected Systems:

There are systems that use `useApplicationStateValue` and `ApplicationStateValueController`.

These systems will need to be updated to align with the new functionality and return types:

1. `useApplicationStateLoader`
2. `useApplicationStateValueStructure`

## Thorough Follow-Through:

Update/create all related/necessary tests/docs/doc-comments/READMEs/demos/examples/samples/etc.

# IMPORTANT NOTES:

**YOU MAY ADD TO, BUT DO NOT OVERWRITE THIS DOCUMENT.**

# Phase 1:

Propose your implementation.

**DO NOT DO ANY WORK UNTIL YOUR PROPOSED SOLUTION HAS BEEN REVIEWED AND APPROVED.**

## Proposed Implementation

### Current Phase Checklist

- [x] Inspect the current `ApplicationState` / loader implementation and tests.
- [x] Propose a typed, setter-compatible design for `useApplicationStateValue`.
- [x] Propose follow-through updates for `useApplicationStateLoader`, `useApplicationStateValueStructure`, tests, and docs.
- [ ] Await review / approval before Phase 2 implementation.

### Proposed Design

Keep the current map-backed provider architecture, but make the context expose real React state setters instead of
pre-resolved replacement functions. That preserves the current storage model while enabling timeless setter callbacks and
functional updates.

#### 1. Introduce typed setter primitives

Add the equivalent of React's `SetStateAction` at the application-state level:

- `ApplicationStateSetAction<ValueType> = ValueType | ((previousValue: ValueType) => ValueType)`
- `ApplicationStateSetter<ValueType> = (value: ApplicationStateSetAction<ValueType>) => void`

For the map containers:

- `ApplicationStateContextType["onChange"]` should become `Dispatch<SetStateAction<ApplicationState>>`
- `ApplicationStateContextType["setModified"]` should become `Dispatch<SetStateAction<ApplicationStateModificationState>>`

That lets downstream hooks delegate to the provider's `useState` setters directly, which are stable by React contract.

#### 2. Type identifiers by attached value type

Change `ApplicationStateIdentifier` from a non-generic structural object to a generic branded shape:

- `ApplicationStateIdentifier<ValueType = any>`

The runtime value can stay as the same nested object reference. The type layer should carry a phantom field so TypeScript
can remember the intended value type without affecting runtime behavior.

Example direction:

- `ApplicationStateIdentifier<ValueType = any> = Record<string, ApplicationStateIdentifier<any> | {}> & { readonly __valueType__?: ValueType }`

Then:

- `getApplicationStateIdentifier<SubStateIdStructure extends ApplicationStateIdentifier<any>>(subStateIdMap?: SubStateIdStructure): ...`
- calling `getApplicationStateIdentifier<UserProfile>()` should produce an `ApplicationStateIdentifier<UserProfile>`
- calling `getApplicationStateIdentifier({ nested: existingIdentifier })` should preserve the structural identifier object behavior

I do not recommend inferring value type from nested identifier paths. The value type should belong to the final identifier
object passed to `useApplicationStateValue`, not to each nested segment.

#### 3. Make `useApplicationStateValue` generic and setter-compatible

Change:

- `useApplicationStateValue(identifier: ApplicationStateIdentifier): ApplicationStateValueController`

To:

- `useApplicationStateValue<ValueType = ApplicationStateValue>(identifier: ApplicationStateIdentifier<ValueType>): ApplicationStateValueController<ValueType>`

And change the controller to:

- `value: ValueType | undefined`
- `onChange: ApplicationStateSetter<ValueType | undefined>`
- `setModified: (value: boolean) => void`

Implementation detail:

- `onChange` should be a `useCallback` that only depends on `identifier`, `setApplicationState`, and `setModificationState`
- inside it, call `setApplicationState(previousState => { ... })`
- resolve functional updates against `previousState.get(identifier)` rather than `appStateRef.current`
- call `setModificationState(previousModified => setApplicationStateModified(identifier, true, previousModified))`

This removes the need for the `appStateRef` / `modificationStateRef` workaround and makes the setter semantics match
React `useState`.

#### 4. Update `useApplicationStateValueStructure` to preserve field types

Make the identifier structure generic by field:

- input: `Record<keyof StructureType, ApplicationStateIdentifier<StructureType[keyof StructureType]>>`
- output handlers: `Record<keyof StructureType, ApplicationStateSetter<StructureType[K] | undefined>>`

Implementation should also use functional map updates so each field setter is stable and not closed over a stale
`applicationState` snapshot.

This is important because the current implementation recreates per-field setters whenever state changes.

#### 5. Update `useApplicationStateLoader` to return typed value access

The current hook only returns loading controls, but it internally uses `useApplicationStateValue`. Since the plan
explicitly calls out "loader return props", I recommend extending it rather than leaving typed value access hidden.

Proposed shape:

- `useApplicationStateLoader<ValueType = any>(config: ApplicationStateLoaderConfig<ValueType>): ApplicationStateLoader<ValueType>`
- include `value`, `modified`, `onChange`, and `setModified` from `useApplicationStateValue(identifier)` in the returned loader object

That gives consumers a single typed hook for:

- current loaded value
- local optimistic edits
- invalidation / reload
- error / loading state

If you want to keep the loader's public surface smaller, the fallback is to keep the current return type and only
genericize the config plus its internal `useApplicationStateValue` call. But based on the plan title, returning the
typed controller props looks like the intended direction.

#### 6. Keep provider runtime behavior unchanged

`ApplicationStateProvider` can continue to use:

- `const [modified, setModified] = useState(new Map())`
- `const [value, setValue] = useState(new Map())`

The only meaningful change is that the context now exposes the raw React setters with precise types.

### Files Expected To Change In Phase 2

- `src/app/utils/ApplicationState.tsx`
- `src/app/utils/ApplicationStateLoader.tsx`
- `src/app/index.ts`
- `src/app/utils/ApplicationState.test-utils.ts`
- `src/app/utils/ApplicationStateLoader.test-utils.ts`
- nearby `*.spec.json` files for new runtime/type-contract scenarios

### Verification Plan For Phase 2

- Add runtime coverage for functional `onChange(previous => next)` updates.
- Add coverage that `onChange` remains usable across rerenders without stale-state loss.
- Add coverage that `useApplicationStateLoader` returns typed state props if we adopt the extended return shape.
- Add type-oriented test utilities that prove identifier generics flow into:
  - `useApplicationStateValue`
  - `useApplicationStateValueStructure`
  - `useApplicationStateLoader`
- Update doc comments and top-level examples in `src/app/index.ts` to show the generic identifier pattern.

### Risks / Decisions Needing Approval

1. Whether `useApplicationStateLoader` should expose `value`, `modified`, `onChange`, and `setModified` in its return
   type, or stay as a loading-only hook.
2. Whether `value` should be typed as `ValueType | undefined` (recommended, because empty map entries are possible) or
   as bare `ValueType`.
3. Whether to use a phantom property brand on `ApplicationStateIdentifier<ValueType>` or a unique symbol brand. I
   recommend a phantom optional property because it is simpler and does not affect runtime behavior.
