# Fix Structured Search Terminal Cursors

## Goal

Prevent structured leaf searches and the structured action handler from returning cursors after pagination is exhausted.

## Checklist

- [x] Emit term and range leaf cursors only when the backend supplies continuation state.
- [x] Stop the `SearchStructured` action handler from restoring an exhausted incoming cursor.
- [x] Add term, range, and handler regression coverage for terminal pages.
- [x] Run the focused structured specs, full core suite, and build.
- [ ] Commit, push, and open a draft pull request.

## Scope Boundary

Compound `AND`/`OR` continuation is a separate pagination design concern and is intentionally excluded from this fix.
