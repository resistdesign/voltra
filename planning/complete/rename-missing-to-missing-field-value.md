# Rename Validation Missing Error Constant

## Goal
Rename `ERROR_MESSAGE_CONSTANTS.MISSING` to `ERROR_MESSAGE_CONSTANTS.MISSING_FIELD_VALUE` with value `"MISSING_FIELD_VALUE"`, and update all code, tests, docs, comments, and examples accordingly.

## Checklist
- [x] Update `src/common/TypeParsing/Validation.ts` constant key/value.
- [x] Update all TypeScript/JSON/Markdown call-sites and references from `MISSING` to `MISSING_FIELD_VALUE` where it refers to this validation error constant.
- [x] Run validation searches/tests to confirm no stale references remain and behavior still passes.
