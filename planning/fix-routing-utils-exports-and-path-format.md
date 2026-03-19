# Fix routing utils exports and path format

## Goals

- [x] Fix `useRouteContext()` so consumer-facing route path fields use readable slash-delimited strings instead of the
      internal JSON-serialized path format.
- [x] Preserve the internal route path format needed for matcher/path-resolution internals, with clear doc-comments about
      which field is for consumers vs internal handling.
- [x] Export the full `src/common/Routing.ts` utility surface from the `common` barrel.
- [x] Update nearby docs/examples/package docs and add or update spec coverage for the changed route-context and common
      export behavior.

## Current phase

- [x] Add a checklist-driven implementation plan to this file and keep it updated as work completes.
- [x] Update route context shape, route matching internals, and doc-comments in `src/app/utils/Route.tsx`.
- [x] Export common routing utilities from `src/common/index.ts`.
- [x] Add or update specs/test-utils covering route context output and common barrel routing exports.
- [x] Run focused verification for the affected specs.
