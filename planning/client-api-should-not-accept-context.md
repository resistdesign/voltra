# Client API Must Not Accept Context

## Goals

- Ensure app/client code cannot pass `context?: TypeInfoORMContext` to ORM API methods.
- Keep server-side ORM API contract unchanged where context is required for DAC.
- Introduce an elegant, reusable client-safe type derived from `TypeInfoORMAPI`.

## Phase 1 - Client-Safe API Contract

- [x] Add a shared client-safe API type that strips trailing `TypeInfoORMContext` from ORM methods.
- [x] Update `TypeInfoORMClient` to implement the client-safe API type and remove all context method args.
- [x] Update app-side API utilities to use the client-safe API type so wrappers also disallow context.
- [x] Run targeted specs for ORM client and API utils and confirm passing behavior.

## Phase 2 - Documentation, Examples, and Test Alignment

- [x] Update app/demo examples to reference the client-safe ORM API type.
- [x] Add compile-time test assertions proving client APIs reject `context`.
- [x] Verify targeted specs and `yarn doc` pass after alignment updates.
