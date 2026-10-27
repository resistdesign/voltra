# Conditional canonical ORM writes and strong reads

Owner request: https://github.com/resistdesign/voltra/issues/423

Goal: expose reusable conditional canonical CRUD and required strong reads through normal ORM validation/access control, preserving existing defaults and backend isolation.

- [x] Add shared conditional-create/update/read contracts and atomic supported-driver enforcement with explicit unsupported behavior.
- [x] Wire service, routes and client without shifting existing server context arguments; review neighboring consumers.
- [x] Add nearby native JSON behavioral specs for conflicts, missing/stale updates, indexing safety, strong-read authorization/projection, forwarding and recovery; document backend guarantees and partial-success recovery.
- [x] Run locked dependency install, tests, generated demo metadata check, package/demo API/app/IaC builds, exports and consumer checks; local verification complete, including the authorization repair below. Independent configured checks and owner acceptance remain separate.
- [x] Review scope and make one focused commit. Owner acceptance remains pending.

## Design and verification notes

The original issue and current source agree on the gap. Optional driver capability declarations advertise atomic config enforcement through existing create/update methods; legacy/file drivers must never receive a conditional request as an unconditional write. Conditions compare scalar field values and always require an existing update target. Strong-read config is appended after the existing server context argument; the client-safe API forwards it without accepting context. Canonical and index writes remain separate operations.

## Implementation review

Generic create/read options and update guards are exported through the existing common barrel. Driver capability declarations are optional; DynamoDB and in-memory data drivers enforce conditional configs, file and legacy drivers are refused before mutation. In-memory relationship drivers inherit support; indexing relationship adapters, HealthStore, list/maintenance helpers and app hook wrappers retain their contracts. Route handlers preserve server-owned context; operator filtering preserves guards. The error wrapper now binds the receiver, preserves supported optional methods, and enriches asynchronous rejections while retaining their message. Existing maintenance reindex consequently retains its preferred strong reader through the wrapper.

Behavioral verification uses native JSON specs with real in-memory canonical/index backends and a single index-writer fault injection. DynamoDB SDK sends are intercepted with zero AWS calls; command aliases, old expected values versus increment deltas, existence checks, strong dispatch, conflict translation and unchanged infrastructure errors are checked without a second backend simulator. File-driver refusal specs replace I/O methods with failures to ensure unsupported requests never reach them. External consumer smoke also compiles the new public types and verifies that client calls cannot supply server DAC context.

Guard/operator review found that the existing DynamoDB decrement expression left an unused positive-delta value alongside its referenced negative delta. Removed that unused value so guarded decrements remain valid DynamoDB requests; the intercepted-command spec checks every expression value is referenced. No change to numeric operator semantics.

## Verification reconciliation — 2026-10-26

The supplied check records show all nine configured checks exiting 127 with `yarn: not found`, before repository commands executed. Both earlier local-success tables lacked corroboration in those records and must not be treated as configured-check passage. The missing executable establishes an environment failure, not a source failure.

A new local execution on the unchanged implementation at `9b7775bfb` completed between 23:13 and 23:17 UTC. The command tool returned exit 0 for each exact command below, including completion of all nested build/test scripts. Yarn 1.22.22 was already available at `/usr/local/bin/yarn`; Node was v24.22.0 (CI specifies 20.x). No package manager was installed and no framework source, check configuration or tooling was changed. The owner issue and empty comment history were independently reread; this evidence correction stays within that issue's framework scope.

These are observed local command results, not a claim that the configured check executor was repaired. Its supplied records still show 0/9 passing. Independent configured-check verification remains unresolved until that executor can find Yarn and return successful results; that environment and check execution belong to the enclosing workflow. Owner acceptance remains pending.

| Exact command | Observed local result |
| --- | --- |
| `yarn install --frozen-lockfile` | Exit 0; already up to date; `yarn.lock` unchanged. |
| `yarn test` | Exit 0; both core and native JSON suites completed successfully; native summary reports 58 passes, 0 failures/errors. |
| `yarn site:build:demo-types && git diff --exit-code -- site/common/DemoTypeInfoMap.json` | Exit 0; generated metadata unchanged. |
| `yarn build` | Exit 0; bundles, declarations and dist preparation succeeded. |
| `yarn site:build:api` | Exit 0. |
| `yarn site:build:app` | Exit 0; Astro, TypeDoc and site finalization succeeded. |
| `yarn site:build:iac` | Exit 0; local generation only. |
| `yarn test:exports` | Exit 0; export validation passed. |
| `yarn test:consumer` | Exit 0; packed-package type/runtime/import smoke checks passed. |
| `git diff --check` | Exit 0 after the final record update. |

Limits: no live cloud/integration operations, deployment or seeding were run. DynamoDB command interception is behavioral request/translation evidence, not live distributed-concurrency proof. Canonical/index writes remain separate; existing maintenance APIs and their previous-snapshot requirements are documented and exercised. The repair diff changes only this existing verification record; the lockfile and generated demo metadata remain unchanged. Owner acceptance and integration remain pending; keep this product plan active until accepted.

## Additional verification — 2026-10-26, 23:19–23:21 UTC

Independently reread owner issue #423 (still open, no comments), its acceptance scope and repository guidance. No source defect is identified by the supplied failures: all nine stop before execution with `yarn: not found`. A public framework change cannot repair the separate executor's executable availability; installing tooling or changing that executor is outside this delivery's authorization. The verification checklist remains `[~]` for that concrete unresolved prerequisite, not for missing local behavioral coverage.

Reran all nine exact commands in the table above on unchanged implementation HEAD `9e6c5bce0`. Each returned exit 0 locally using the existing Yarn 1.22.22 and Node v24.22.0. Core JSON specs reported 1,036 passes and native specs 58 passes, both with zero failures/errors. The package consumer smoke check completed successfully. The lockfile and tracked demo metadata remain unchanged. These fresh observations do not supersede the supplied executor's 0/9 results or establish configured verification. No product source, package/check configuration, executable installation or remote environment changes were made. The remaining action belongs to the enclosing workflow: make Yarn available to its check process and rerun the unchanged configured checks. Owner acceptance remains pending.

## Expected-field read authorization repair

- [x] Authorize observation of every expected field through caller READ DAC before atomic condition dispatch, preserving readonly guards and existing defaults.
- [x] Add native JSON regression coverage for matching/nonmatching protected guesses, unchanged canonical/index state, and permitted readonly/public guards.
- [x] Run relevant behavioral and framework checks and record actual evidence.

The owner request was reread directly, including its empty comment history. Guard authorization preserves its access-control requirement within the existing generic ORM boundary. Expected fields now require caller READ access before conditional driver dispatch; both expected values and the stored snapshot are checked because DAC paths may constrain values. Unauthorized guards fail with `INVALID_OPERATION` without removing any condition or entering the canonical mutation/index path. Backend condition enforcement remains atomic; readonly/read-authorized guards need no write permission. Unguarded updates retain their existing behavior.

The new native JSON behavioral case uses real in-memory canonical and index backends. On the original implementation it failed: a matching secret guess mutated the record, so the later permitted guard conflicted. With the repair, both matching and nonmatching guesses are denied under field-wide and stored-value-specific READ restrictions. The record and its indexes remain unchanged; public-field guards and a readable readonly score guard succeed, while a stale permitted guard still conflicts. The earlier historical executor failure notes above are dated evidence; the supplied review reports they were superseded by subsequent passing configured checks.

Fresh local verification on the repaired source (Node v24.22.0, Yarn 1.22.22):

| Command | Observed result |
| --- | --- |
| `yarn install --frozen-lockfile` | Exit 0; already up to date, lockfile unchanged. |
| `yarn test` | Exit 0; 1,037 core and 58 native passes, zero failures/errors. |
| `yarn site:build:demo-types` and `git diff --exit-code -- site/common/DemoTypeInfoMap.json` | Both exit 0; generated metadata unchanged. |
| `yarn build` | Exit 0; bundles, declarations and package preparation passed. |
| `yarn site:build:api` | Exit 0. |
| `yarn site:build:app` | Exit 0, including documentation generation/finalization. |
| `yarn site:build:iac` | Exit 0; local generation only. |
| `yarn test:exports` | Exit 0. |
| `yarn test:consumer` | Exit 0. |
| `git diff --check` | Exit 0. |

No live cloud operations, deployment or application data seeding. These are local results, not owner acceptance; the plan stays active pending acceptance.

## Owner revisions — 2026-10-27

- [x] Require strong snapshots before and after guarded updates; regress stale ordinary reads.
- [x] Normalize a guarded false result to conflict before post-write reads/index work.
- [x] Preserve rejected error identity and diagnostics with typeName.
- [x] Pass typed configs through existing driver create/update methods; reconcile capabilities, callers and docs.
- [x] Move only the conditional service spec/helper pair into TypeInfoORMService/.
- [x] Run relevant native regressions and framework checks; record evidence.

These revisions implement the current owner threads on PR #424 within issue #423. The existing guard READ DAC repair remains required. Strong snapshots address single-writer stale indexing; they do not serialize concurrent index writers.

Conditional configs now flow through `createItem`/`updateItem`, with optional capability declarations preserved by the driver wrapper. DynamoDB and in-memory data drivers retain atomic enforcement; file drivers explicitly reject guarded configs even for direct callers, and legacy drivers remain refused by the ORM. Guarded updates require strong canonical snapshots both before and after mutation. False results become conflicts before post-write reads/indexing. Existing defaults and expected-field READ authorization remain intact. Rejections retain Error identity/prototype, name, stack, cause and provider diagnostics with typeName; frozen errors retain their prototype and own diagnostic descriptors, with stack materialized for runtime compatibility.

Moved only the requested conditional spec/helper pair under `TypeInfoORMService/`. Updated route forwarding expectations to include the guard snapshots (one losing guard read, two successful mutation snapshots and one explicit strong read). No route/client API or server context argument changed.

Focused verification: the conditional, canonical-driver and route JSON specs pass 13 tests with zero failures/errors. The stale-read case makes ordinary reads return an obsolete version across a successful CAS, then checks canonical state, raw stored postings and ORM lookup results. The false-return stub verifies one pre-write read, one conditional mutation and no index work/post-write read, plus refusal when a strong reader is unavailable. Rejected-error tests cover infrastructure TypeError identity, conditional cause/provider metadata and frozen Error diagnostics. The intercepted DynamoDB conditional put verifies its SDK cause and metadata survive wrapping. Temporarily reintroducing each of the three defects independently made its new regression fail; the repaired source was restored before final checks.

Fresh local verification (Node v24.22.0, Yarn 1.22.22):

| Command | Observed result |
| --- | --- |
| `yarn install --frozen-lockfile` | Exit 0; already up to date; lockfile unchanged. |
| `yarn test` | Exit 0; 1,040 core and 58 native passes; zero failures/errors. |
| `yarn site:build:demo-types` and generated metadata diff check | Exit 0; metadata unchanged. |
| `yarn build` | Exit 0, including declarations and package preparation. |
| `yarn site:build:api` | Exit 0. |
| `yarn site:build:app` | Exit 0, including TypeDoc and site finalization. |
| `yarn site:build:iac` | Exit 0; local generation only. |
| `yarn test:exports` | Exit 0. |
| `yarn test:consumer` | Exit 0; packed-package type/runtime/import checks passed. |
| `git diff --check` | Exit 0. |

No live cloud operations, deployment or seeding. Strong snapshots address the requested single-writer stale-read defect; canonical and index writes remain separate and concurrent index writers are not serialized. The existing recovery APIs/documentation still apply. These local observations do not settle owner acceptance; the plan remains active.

## No-index conditional capability repair — 2026-10-27

- [x] Separate atomic conditional-update support from indexing/security snapshot requirements.
- [x] Add no-strong-reader native JSON behavior coverage and reconcile documentation; preserve stale-index and DAC regressions.
- [x] Run relevant behavioral/framework checks and record observed results.

The owner’s additional PR #424 decision allows atomic no-index guarded updates without a strong reader. Strong snapshots remain required for configured indexing and expected-field READ DAC checks that inspect stored values. This is within issue #423’s independent capability contracts; no shared public API, route/client positions or driver implementations need to change.

The service now enforces conditional-write capability independently and requires strong snapshots only for configured indexing or expected-field READ DAC. Where a strong reader is available, guarded updates still prefer it. The indexed false-result test now configures indexing explicitly, retaining its unsupported-reader refusal. The new no-index case delegates to the real in-memory atomic implementation through the generic driver contract with no strong reader; existence and expected-value updates succeed, stale/missing guards conflict, false results normalize to conflict, and losing payloads never overwrite or upsert canonical state. Existing DAC and stale-index regressions pass. Temporarily restoring the unconditional strong-reader refusal makes precisely the new case error with `UNSUPPORTED_CAPABILITY` (7 passes, 1 error); final source was restored and the focused battery passed again (8 passes, zero failures/errors).

Fresh local verification (Node v24.22.0, Yarn 1.22.22):

| Command | Observed result |
| --- | --- |
| `yarn install --frozen-lockfile` | Exit 0; already up to date; lockfile unchanged. |
| `yarn test` | Exit 0; 1,041 core and 58 native passes; zero failures/errors. |
| `yarn tsx src/common/Testing/CLI.ts './src/api/ORM/TypeInfoORMService/ConditionalWrites.spec.json'` | Exit 0; 8 passes, zero failures/errors on final source. |
| `yarn site:build:demo-types` and generated metadata diff check | Exit 0; metadata unchanged. |
| `yarn build` | Exit 0; bundles, declarations and package preparation passed. |
| `yarn site:build:api` | Exit 0. |
| `yarn site:build:app` | Exit 0, including documentation generation/finalization. |
| `yarn site:build:iac` | Exit 0; local generation only. |
| `yarn test:exports` | Exit 0; export validation passed. |
| `yarn test:consumer` | Exit 0; packed-package type/runtime/import smoke checks passed. |
| `git diff --check` | Exit 0. |

An initial full-suite run caught changed route strong-read counts; preserving preferred strong reads when supported resolved it without changing route fixtures. No public contracts, drivers, route/client argument positions or unrelated work changed. No cloud operations, deployment or seeding; no live distributed-concurrency claim. Owner acceptance remains separate, and this plan remains active.

## Snapshot-free guarded update repair — 2026-10-27

Owner follow-up: PR #424 discussion_r4390451231. The prior no-index repair still read before and after an atomic write; missing or failing readers could prevent or misreport canonical success. This follow-up preserves the independent conditional-write capability and all earlier DAC/index safeguards.

- [x] Skip snapshots for guarded updates without indexing or expected-field READ DAC; retain conflict normalization and default behavior.
- [x] Add native JSON regressions with real atomic mutations and missing/fail-if-called ordinary and optional strong readers; reconcile snapshot documentation.
- [x] Run relevant behavioral/framework checks and record actual repair evidence. Leave this plan active pending explicit owner acceptance.

The new `runConditionalWithoutSnapshots` native JSON case uses the real in-memory driver's atomic expected-value update through the generic contract, with ordinary readers that report missing or fail if called, both with and without an optional strong reader that fails if called. Each case asserts successful canonical mutation, stale-guard rejection, false-result conflict normalization, unchanged winning data and zero reader calls. Before the service repair, this case produced `ITEM_NOT_FOUND` (8 passes, 1 error); after repair, all four cases pass. Existing DAC and indexed safety/refusal cases remain intact. The service now selects a snapshot reader only for guarded indexing or expected-field READ DAC, and skips post-write snapshots for all no-index guarded updates. Unguarded behavior is unchanged. This supersedes the preceding repair's preference for optional strong readers when no snapshot is needed.

The route forwarding expectation now records 1 strong read without DAC (the explicit authorized read), and 3 with DAC (two guard authorization snapshots plus the explicit read). Its conflict and payload assertions are unchanged; no route/client API or backend code changed. `INDEXING_INTEGRATION.md` now documents snapshot-free success instead of claiming ordinary reads suffice.

Fresh local verification on Node v24.22.0 / Yarn 1.22.22:

| Command | Observed result |
| --- | --- |
| `yarn tsx src/common/Testing/CLI.ts './src/api/ORM/TypeInfoORMService/ConditionalWrites.spec.json' './src/api/ORM/ORMRouteMap.spec.json'` | Exit 0; 13 passes, zero failures/errors on final source. |
| `yarn test` | Exit 0; 1,042 core and 58 native passes, zero failures/errors. |
| `yarn build` | Exit 0; bundles, declarations and package preparation passed. |
| `yarn site:build:demo-types` and generated metadata diff check | Exit 0; metadata unchanged. |
| `yarn site:build:api` | Exit 0. |
| `yarn site:build:app` | Exit 0; includes TypeDoc and site finalization. |
| `yarn site:build:iac` | Exit 0; local generation only. |
| `yarn test:exports` | Exit 0. |
| `yarn test:consumer` | Exit 0; packed-package type/runtime/import smoke checks passed. |
| `git diff --check` | Exit 0. |

The original owner merge-gate commit `585627a84fee17ff6254aebd290e86143d264926` remains an ancestor of this branch. No cloud operations, deployment or seeding were run. These are local repair observations, not owner acceptance or a claim about live distributed concurrency. The product plan remains active; no PR approval or merge is authorized by these checks.
