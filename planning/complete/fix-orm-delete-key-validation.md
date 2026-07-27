# Fix ORM delete-key validation

## Goal

Delete items by validated identity without treating a key-only delete request as
a complete record.

## Checklist

- [x] Reproduce the required-field regression with a focused ORM scenario.
- [x] Validate DELETE permission and the primary field only.
- [x] Run focused and full validation.
  - GitHub Actions `Tests` workflow run 172 completed successfully.
- [x] Publish a branch and draft pull request.
