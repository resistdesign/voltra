# Goal
Remove `require` runtime hacks from app universal routing and move native/mobile back integration into a native Route wrapper that passes an optional mechanism into core app Route.

## Checklist
- [x] Add optional route integration mechanism prop to core app Route.
  - [x] Define mechanism type in `src/app/utils/Route.tsx`.
  - [x] Extend root Route props to accept mechanism.
  - [x] Make root provider run mechanism lifecycle when provided.

- [x] Remove `require`-based runtime probing from universal adapter.
  - [x] Delete `getRuntimeRequire` and `tryGetReactNativeBackHandler`.
  - [x] Remove BackHandler lifecycle from `createNativeRouteAdapter`.
  - [x] Keep existing web/native adapter behavior otherwise unchanged.

- [x] Add native Route wrapper that conditionally passes mechanism.
  - [x] In `src/native/utils/Route.ts`, export a `Route` component wrapper around app Route.
  - [x] Detect `Platform.OS` in wrapper and only pass mechanism when non-web.
  - [x] Add helper(s) for native back integration wiring.

- [x] Update tests/specs.
  - [x] Remove obsolete universal adapter tests tied to runtime require hook.
  - [x] Add native route helper/mechanism tests.

- [x] Verify and update planning record.
  - [x] Run targeted tests.
  - [x] Run full `yarn test`.

## Follow-up
- [x] Replace native wrapper dynamic `import("react-native")` with normal static `react-native` imports.
- [x] Add explicit note in `src/native/index.ts` that direct `react-native` imports are expected in native barrel code.

## Native VEST Lane
- [x] Add dedicated native VEST scripts that run native barrel specs without Jest/Metro.
- [x] Add native test tsconfig path mapping for `react-native`.
- [x] Add minimal `react-native` test shim for native barrel test execution in Node.
- [x] Verify `yarn test`, `yarn test:native`, and `yarn test:all`.

## Script Rename Follow-up
- [x] Rename `test` -> `test:core`.
- [x] Rename `test:all` -> `test`.
- [x] Rename `test:gen` -> `test:core:gen`.
- [x] Verify renamed `yarn test:core` command executes successfully.

## Native Route TSX Cleanup
- [x] Convert `src/native/utils/Route.ts` to a normal TSX component module.
- [x] Remove `createElement` usage in native `Route` wrapper in favor of JSX.
- [x] Verify `yarn test:native` and `yarn test:core` after conversion.
