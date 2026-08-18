# Fix Indexed `IN` for Array Fields

## Goal

Make indexed ORM execution preserve Voltra's existing canonical `IN` semantics for array fields: an array field matches when any element appears in `valueOptions`, while scalar `IN` remains scalar equality disjunction.

## Checklist

- [x] Confirm the current canonical matcher, indexed compiler, TypeInfo capability generation, and structured index storage semantics.
- [x] Add explicit collection metadata to indexed field capabilities derived from TypeInfo array fields.
- [x] Compile `IN` for collection fields as an OR of `contains` term expressions while preserving scalar `IN` as an OR of `eq` terms.
- [x] Add focused compiler and capability-generation regression coverage for scalar and array `IN` behavior.
- [x] Add ORM-level regression coverage proving indexed array `IN` matches canonical semantics.
- [~] Verify the final diff and CI/build/test status available through GitHub. Final diff reviewed; local execution is unavailable because this environment cannot resolve github.com, so PR CI will provide the authoritative `yarn test`, `yarn build`, and `yarn test:exports` results.
- [ ] Open a pull request with scope, compatibility notes, and validation evidence.
