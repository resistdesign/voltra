# Plan: Make DAC role resolution async

## Change

Update all DAC utilities to accept:

* `getDACRoleById: (id: string) => Promise<DACRole>`

## Code updates

1. `src/api/DataAccessControl.ts`

  * `getFlattenedDACConstraints` -> `async`, returns `Promise<DACConstraint[]>`.
  * `getResourceAccessByDAC

Role`->`async`, returns `Promise<DACAccessResult>`.

* Use `await getDACRoleById(id)` while walking child roles; keep `dacRoleCache` support.

2. Propagate async to callers:

  * `src/api/ORM/DACUtils.ts`
  * `src/api/ORM/TypeInfoORMService.ts` (also update `TypeInfoORMDACConfig.getDACRoleById` type)
  * `src/api/ORM/ORMRouteMap.test-utils.ts`

## Tests

* `src/api/DataAccessControl.test-utils.ts`: make scenario export `async`, use async `getDACRoleById`, and await DAC helpers.
* `src/api/DataAccessControl.spec.json`: should stay the same; Vest already awaits the export.

## Docs

* Update the `@packageDocumentation` example in `src/api/DataAccessControl.ts` to show `await` usage.

## Done when

* TypeScript build passes.
* `yarn test` passes.
