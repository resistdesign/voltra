# Repair Missing Text Index Mirrors

## Goal

Make text index updates self-heal legacy or newly configured fields whose document mirror is missing, without adding reads to the normal mirror-backed update path.

## Checklist

- [ ] Reproduce missing mirror with absent and partial legacy postings.
- [ ] Recover actual token membership only when the mirror is missing.
- [ ] Repair missing and obsolete postings, positions, statistics, and membership.
- [ ] Persist the mirror so later updates return to the normal fast path.
- [ ] Verify mirror-backed updates perform zero membership fallback calls.
- [ ] Run focused and full validation.
- [ ] Open a draft pull request with root cause, behavior, and validation.
