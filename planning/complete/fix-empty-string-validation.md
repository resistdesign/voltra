# Fix Empty-String Validation

## Goal

Treat an empty string as a present string value. Empty-string rejection must come from explicit field constraints, not required-field presence validation.

## Checklist

- [x] Change `hasValue()` to reject only `undefined` and `null`.
- [x] Add validation coverage proving required string fields accept `""`.
- [x] Add coverage proving explicit constraints can reject `""`.
- [x] Audit existing callers of `hasValue()` for behavior changes.
- [x] Update documentation that describes empty strings as missing, if any.
- [x] Run the focused validation tests and full Voltra test suite.
- [x] Publish the change in a draft pull request targeting `main`.
