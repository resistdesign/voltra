# ORM Health Monitoring

## Goal

Add an optional, infrastructure-neutral Voltra health subsystem that can observe ORM performance, persist operational health state through one normal ORM-style data driver, audit index integrity, perform strongly validated bounded repairs, and resume scheduled work safely.

## Checklist

- [x] Add the public `@resistdesign/voltra/health` barrel and package/build/docs/export wiring.
- [x] Define one extensible driver-backed Health record model for telemetry, findings, repair history, runs, checkpoints, and queued work.
- [x] Add lightweight optional ORM operation timing/diagnostic observation without allowing health recording failures to change ORM behavior.
- [~] Add bounded ORM/index inspection primitives needed by health monitoring, including paged structured-document enumeration and safe item-level index repair. (Dynamo-backed enumeration and optimistic structured-version guards are in place; in-memory parity and the public repair surface remain.)
- [ ] Implement a resumable `TypeInfoORMHealthMonitor` that:
  - [ ] records/compacts slow-query and operation statistics;
  - [ ] audits canonical/index state by type in bounded pages;
  - [ ] requires repeated/strong validation before destructive orphan cleanup;
  - [ ] reindexes canonical survivors when repair is needed;
  - [ ] persists progress/checkpoints and repair findings in the Health store;
  - [ ] prunes expired Health records without requiring storage-specific TTL support.
- [ ] Add focused specs for observation, persistence/progress, orphan detection, destructive-validation safety, repair idempotency, and bounded continuation.
- [ ] Update consumer/export checks and public documentation/examples for the new barrel.
- [ ] Add a focused demo-site/IaC example that provisions a Health store and runs the Health monitor in the existing Voltra demo architecture.
- [ ] Run build, core tests, export checks, and consumer smoke checks; fix regressions.
- [ ] Open a professional PR with implementation/safety notes and verification evidence.

## Guardrails

- Health is fully optional and must not alter normal ORM correctness when disabled.
- Normal ORM requests must never start an unbounded repair sweep.
- Destructive repair must be type+ID scoped, idempotent, and independently revalidated.
- Every monitor run must have explicit work limits and resumable continuation.
- Health storage is one logical driver-backed store; do not require DynamoDB-specific infrastructure.
- Keep deployment orchestration out of Voltra: consumers may run the monitor from Lambda, Fargate, cron, queues, or any other TypeScript runtime.
- Preserve existing API/index contracts unless a narrowly scoped health capability requires an additive extension.
