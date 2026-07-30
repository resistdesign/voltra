# Repair Missing Text Index Mirrors

## Goal

Make text index updates self-heal legacy or newly configured fields whose document mirror is missing, without adding reads to the normal mirror-backed update path.

## Checklist

- [x] Reproduce missing mirror with absent and partial legacy postings.
- [x] Recover actual token membership only when the mirror is missing.
- [x] Repair missing and obsolete postings, positions, statistics, and membership.
- [x] Persist the mirror so later updates return to the normal fast path.
- [x] Verify mirror-backed updates perform zero membership fallback calls.
- [x] Run focused and full validation.
- [x] Open a draft pull request with root cause, behavior, and validation.

## Validation

GitHub Actions run 30509939305 passed the complete test job:

- tests
- distribution build
- export checks

The medium-scale DBX job was skipped by its workflow condition.
