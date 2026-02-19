# AutoForm Validation Should Conform To Existing Shapes

## Checklist

- [x] `src/app/forms/Engine.ts` `validate` returns a `TypeInfoValidationResults` object.
- [x] `TypeInfoValidationResults` `error` and `errorMap` use structured error descriptors:
  - [x] Add `ErrorDescriptor` type (`code` + optional `values`).
  - [x] Add `ErrorMap` type (`Record<string, ErrorDescriptor[]>`).
  - [x] Update `TypeInfoValidationResults` to use `ErrorDescriptor` and `ErrorMap`.
- [x] Update all validation consumers to use the new return type.
- [x] Add `translateValidationErrorCode` prop to `AutoForm` and wire it into internal error rendering.
- [x] Expand `ERROR_MESSAGE_CONSTANTS` to include any needed validation codes (including constraint-oriented codes) and keep it as a strongly-typed constant set.
- [x] Update tests, doc-comments, consuming code, readmes/examples/demos/samples impacted by the refactor.

## Follow-up Checklist (Centralize Data-Item Validation)

- [x] Add a centralized `validateTypeInfoDataItem` function in `src/common/TypeParsing/Validation.ts` that owns full TypeInfoDataItem validation iteration and returns `TypeInfoValidationResults`.
- [x] Add and export a field-level custom validator function signature type and map:
  - [x] `FieldValueValidator`
  - [x] `FieldValueValidatorMap`
  - [x] Ensure call path supports App -> AutoForm -> Engine -> Validation.
- [x] Expand TypeInfo field tags with a `validation` branch in `SupportedFieldTags`:
  - [x] `emptyArrayIsValid?: boolean` (default required arrays remain invalid when empty)
  - [x] `validateHidden?: boolean` (default hidden fields are not validated)
  - [x] Any additional minimal options needed to remove Engine-side branching.
- [x] Update `Validation.ts` field/data-item validators to honor new `tags.validation` options and remove app-specific fallback logic from Engine.
- [x] Update `src/app/forms/Engine.ts` so `validate` delegates fully to common data-item validation and only maps errors for UI.
- [x] Thread `customValidatorMap` support through AutoForm/Engine types and props.
- [x] Update all impacted docs/comments/tests/specs/helpers/consumers for the new centralized API.
- [x] Run full test suite and confirm green.

## Finalization Checklist (Consumer Clarity + Explicit Coverage)

- [x] Add dedicated tests for `validateTypeInfoDataItem` behavior:
  - [x] `tags.validation.validateHidden`
  - [x] `tags.validation.validateReadonly`
  - [x] `tags.validation.emptyArrayIsValid`
  - [x] `customValidatorMap`
- [x] Add/expand consumer examples showing:
  - [x] direct `@resistdesign/voltra/common` validation usage
  - [x] AutoForm `customValidatorMap` + `translateValidationErrorCode`
- [x] Update README sections to document the new validation surface and options.
- [x] Run full test suite and confirm green.

## Notes

- IMPORTANT: Be thorough. Code cleanly. Understand the spirit of this refactor and the uniformity and flexibility it intends to bring. Investigate first. Understand the project.
