# Fix DynamoDB Eventual-Consistency Seeding Failure

## Goal

Make structured indexing correct under DynamoDB's real read-consistency semantics and ensure the test harness can reproduce stale read-after-write visibility.

## Checklist

- [x] Add opt-in stale-read and reordered-property behavior to the test-only DynamoDB client.
- [x] Add failing regressions for stale confirmation reads, semantic equality, and genuine contention.
- [x] Fix the structured writer/client boundary without coupling the production drivers.
- [x] Cover first-write occupancy and sequential seed-scale writes through the Dynamo-shaped lifecycle.
- [x] Run focused, core, native, scale, package, declaration, export, consumer, docs, demo-generation, IaC, and site checks.
- [~] Publish the proven fix on `feat/link-and-lock` and open/update its PR.
  - Blocked because the required GitHub CLI is not installed in the work environment.
