# Goal
Remove native-form runtime/test hacks and keep tests focused on shared AutoForm core behavior.

# Checklist
- [x] Keep native source clean:
  - [x] Replace `require("react-native")` accessors with direct imports in `src/native/forms/suite.ts`.
  - [x] Replace `require("react-native")` accessors with direct imports in `src/native/forms/primitives/index.ts`.
- [x] Remove native source-contract tests (no file-content assertion tests):
  - [x] Remove `src/native/index.spec.json` and `src/native/index.test-utils.ts`.
  - [x] Remove `src/native/forms/createNativeFormRenderer.spec.json` and `src/native/forms/createNativeFormRenderer.test-utils.ts`.
  - [x] Remove `src/native/forms/suite.spec.json` and `src/native/forms/suite.test-utils.ts`.
- [x] Ensure shared core coverage in `app/forms` is sufficient:
  - [x] Add a shared `AutoFormView` test that asserts suite primitive usage for `FormRoot` and `Button` and submit wiring.
- [x] Validation:
  - [x] `yarn test`
  - [x] `yarn doc`
- [x] Update exports checker to skip Node runtime import checks for `./native` barrel:
  - [x] Remove `dist/native/index.js` from `requiredRuntimeExports` in `scripts/check-package-exports.mjs`.
  - [x] Re-run `yarn test:exports`.
- [x] Add exports check to CI test workflow:
  - [x] Update `.github/workflows/tests.yml` to run `yarn test:exports` after `yarn test`.
