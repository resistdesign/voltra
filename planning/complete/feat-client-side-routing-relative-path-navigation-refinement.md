# Feature: Client-side Routing Relative Path Navigation Refinement

## Goals

- Make relative `adapter.push` / `adapter.replace` resolve from the route context where the adapter was acquired, not
  from the full application path.
- Add first-class intra-application navigation link components for the `web` and `native` barrels.
- Update tests, exports, and nearby documentation/comments so the new behavior is covered and discoverable.

## Checklist

- [x] Phase 1: Route adapter scoping
  - [x] Convert route-context adapters to resolve relative navigation from the matched route level
  - [x] Preserve existing root-provider behavior for absolute navigation and subscriptions
  - [x] Add app/web/native tests that prove nested relative navigation uses the route-context base path
- [x] Phase 2: Navigation link components
  - [x] Add a web intra-app navigation link component with full prop pass-through and route-context navigation
  - [x] Add a native intra-app navigation pressable component with full prop pass-through and route-context navigation
  - [x] Export the new components from the relevant utils and top-level barrels
  - [x] Add tests covering navigation behavior and exports
- [x] Phase 3: Finish and verify
  - [x] Review doc comments and tighten wording around relative navigation behavior
  - [x] Run targeted tests for updated route/link behavior
  - [x] Mark completed checklist items in this plan

## Notes

- Relative navigation should follow the `parentPath`/matched route context level where the adapter is obtained.
- If an adapter is used inside a child route, relative navigation should resolve from that child route’s matched path.
- Keep changes non-breaking where possible, but prefer the clean behavior over compatibility hacks if they conflict.
