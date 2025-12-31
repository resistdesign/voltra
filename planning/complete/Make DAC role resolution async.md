# Plan: Make DAC role resolution async

## Change

Update all DAC utilities to accept:

* `getDACRoleById: (id: string) => Promise<DACRole>`

## Code updates

- [x] `src/api/DataAccessControl.ts`
  - [x] `getFlattenedDACConstraints` -> `async`, returns `Promise<DACConstraint[]>`.
  - [x] `getResourceAccessByDACRole` -> `async`, returns `Promise<DACAccessResult>`.
  - [x] Use `await getDACRoleById(id)` while walking child roles; keep `dacRoleCache` support.
- [x] Propagate async to callers:
  - [x] `src/api/ORM/DACUtils.ts`
  - [x] `src/api/ORM/TypeInfoORMService.ts` (also update `TypeInfoORMDACConfig.getDACRoleById` type)
  - [x] `src/api/ORM/ORMRouteMap.test-utils.ts`

## Tests

- [x] `src/api/DataAccessControl.test-utils.ts`: make scenario export `async`, use async `getDACRoleById`, and await DAC helpers.
- [x] `src/api/DataAccessControl.spec.json`: should stay the same; Vest already awaits the export.
- [x] `yarn test`

## Docs

- [x] Update the `@packageDocumentation` example in `src/api/DataAccessControl.ts` to show `await` usage.

## Done when

- [x] TypeScript build passes. (`yarn build`)
- [x] `yarn test` passes.
