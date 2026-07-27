# Fix ORM delete-key validation

## Goal

Delete items by validated identity without treating a key-only delete request as
a complete record.

## Checklist

- [x] Reproduce the required-field regression with a focused ORM scenario.
- [x] Validate DELETE permission and the primary field only.
- [~] Run focused and full validation.
  - Dependency installation was blocked by the restricted network before tests
    could run locally; CI will perform validation on the PR.
- [x] Publish a branch and draft pull request.
