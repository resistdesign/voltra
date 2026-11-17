# Issue #426: Type-qualified structured document identity

Goal: Keep structured document state independent for each (TypeInfo type, item ID), preserving raw candidate IDs and type-qualified postings across all drivers.

- [x] Qualify document-state keys and propagate identity through writers, readers, and maintenance paths.
- [x] Add native regression coverage for shared IDs across types, including updates, removal, and maintenance.
- [x] Verify the regression fails before the fix; run relevant tests and build checks.
- [x] Review the focused diff, commit, push, and open a PR linked to #426.

Scope excludes application ID changes, consistency/transaction refactors, and driver-specific behavior in generic modules.

Validation: original production code fails the shared-ID regression (2 pass, 1 fail); fixed code passes. Full suite: 1,032 core and 58 native tests; build passed. Health legacy-identity regression passes (18 Health tests). All three drivers pass typed-state conformance. Existing persisted structured indexes require a clean rebuild, documented in README.

PR opened: https://github.com/resistdesign/voltra/pull/427. All implementation and validation work is complete. Plan remains active pending user agreement that the work is finished.
