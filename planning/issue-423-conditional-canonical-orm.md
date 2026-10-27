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

## Read configuration architecture revision — 2026-10-27

Owner direction: PR #424 discussion_r4391059665. Required consistency belongs on existing `readItem(id, selectedFields, readConfig?)`, with truthful driver guarantees and explicit refusal. This supersedes historical references above to a separate strong reader. The assigned issue plan remains the work record; unrelated active files are outside this repair.

- [x] Consolidate shared read contract, supported drivers, wrapper, authorized service reads and maintenance onto configured readItem; preserve required snapshots and snapshot-free guarded writes.
- [x] Adapt focused native JSON regressions and public documentation; persist the general CRUD + List/Search/config principle in existing repository guidance.
- [x] Run relevant native/framework checks and record actual evidence; leave plan active pending owner acceptance.

Required consistency now passes through the existing shared `readItem` with `TypeInfoORMReadConfig`. The wrapper retains receiver/error behavior and capability declarations. `capabilities.strongRead` explicitly opts drivers into the guarantee so legacy implementations cannot silently ignore the config. DynamoDB requests ConsistentRead only for required strong reads; local-map data/file reads and S3 HEAD honor the guarantee without a separate shared method. The derived in-memory relationship driver inherits the same contract. Ordinary reads preserve their defaults. Maintenance verification/reindex prefer configured strong reads; best-effort existence checks cannot authorize destructive cleanup.

Native JSON coverage now verifies config forwarding and binding through authorized reads, strong prior/post-write snapshots despite stale ordinary reads, both maintenance callers, legacy strong-read refusal before dispatch and best-effort cleanup refusal. File-driver cases exercise current local state and intercepted S3 HEAD reads; DynamoDB command cases verify required/default consistency and unchanged projection. Earlier expected-field READ DAC, snapshot-free no-index writes, false conflicts, error diagnostics, route/client context positions and recovery cases continue to pass. Source search found no remaining obsolete read method in src/, site/ or scripts/. The concise general architecture principle is recorded in AGENTS.md; no operational material was added.

Verification in this revision: the initial focused run exposed two fixture adaptation errors (receiver binding on the legacy stub and a duplicate local name); both were corrected. The new maintenance case initially used an unsupported operation, then a scalar with object deep comparison; its final object expectation passes. Final full `yarn test` exits 0 with 1,043 core and 58 native passes, zero failures/errors. `yarn build`, `yarn site:build:demo-types`, unchanged generated metadata diff, `yarn site:build:api`, `yarn site:build:iac`, and `yarn test:exports` exit 0. `yarn site:build:app` (including TypeDoc/finalization) and `yarn test:consumer` also exit 0. Final `git diff --check` passes. These are local repair results; independent checks and owner acceptance remain separate. This product plan stays active until explicit owner acceptance. No dependencies were installed manually. Existing owner merge-gate commit 585627a remains an ancestor. No cloud calls, deployment, seeding, approval or merge; live distributed-concurrency behavior is not established by SDK interception.

## Coordinated v3 CRUD contract — owner architecture directive

The current owner directive supersedes the capability/snapshot designs described above. No generic capability registry will remain. Existing CRUD configs request optional behavior directly; drivers enforce it or throw `UNSUPPORTED_CAPABILITY` before side effects.

Contract proposal: driver-only operation configs carry `coordination` callbacks. `inspect` receives the exact full canonical state (or absence) before an operation. `changed` receives exact before/after mutation images after canonical commit. The driver must exclude every competing mutation of that identity, including ordinary/direct writes, from inspection through callback completion. A coordinated read holds the same exclusion while inspecting present or absent state. Callbacks contain generic DAC/index semantics; exclusion mechanisms remain in drivers. Callbacks are server internal and are not route/client options. No extra CRUD methods are added.

Invariant/threat map:

| Path | Required proof and action | Failure/limitation |
| --- | --- | --- |
| Read | Forward requested consistency; DAC evaluates full returned item before projection | Driver refuses unsupported options; ordinary reads have no mutation authority |
| Update and guard READ DAC | Inspect exact state under exclusion, authorize stored state and expected observations, then enforce caller conditions at commit | Denied authorization/failed condition performs no canonical or index work; asynchronous item authorization cannot race replacement |
| Create/overwrite | Exact prior/next images under exclusion; remove overwritten postings then index next image | No submitted-image assumption; conflict never invokes changed |
| Ordinary/guarded update and delete | Exact before/after images; serialized generic index work | No ordinary before/after reads or read-after-write rejection; later writers cannot overtake index work |
| Orphan cleanup | Inspect absence while excluding recreation through all destructive index work | Strong absence alone is insufficient; refuse before cleanup without exclusion |
| Reindex | Inspect current image under exclusion through replacement | No fallback to ordinary state; supplied prior snapshot remains necessary for out-of-band drift |
| Errors | Precommit refusal/authorization/conflict differs from postcommit callback failure | Postcommit failures report canonical commitment and preserve the cause without exposing canonical images; independent stores do not roll back together |

In-memory data/relationship and file storage enforce exclusion for their entire canonical stores. DynamoDB and S3 file drivers currently cannot exclude external writers during asynchronous index callbacks; they must explicitly refuse coordinated operations before requests, while continuing ordinary non-indexed/non-DAC CRUD and supported optional conditions/reads. This is an explicit unavailable guarantee, not silent best effort. All drivers use the same generic indexing algorithm when they can supply the contract. External direct index writes, out-of-band canonical changes and mutable external authorization policy are outside the canonical driver's exclusion domain. No distributed transaction or independent-store rollback is claimed.

- [x] Bind DAC mutation authorization to exact coordinated state first; add concurrent authorization/replacement proof.
- [x] Replace separate mutation reads with coordinated images for all indexed CRUD; prove stale/missing reads, overwrite cleanup, ordering and committed failure diagnostics.
- [x] Coordinate cleanup/reindex and remove capability prediction from contracts, wrappers, drivers, callers, docs and tests; prove safe refusal/recreation.
- [x] Run relevant native and configured framework checks; record actual evidence and remaining limitations. Keep plan active for owner acceptance.


### Coordinated contract verification — 2026-10-27

Read the original issue #423, garden guide, sole job/criterion, accepted architecture specification, current owner comment #6448610949 and all four review findings independently. The owner's expanded directive authorizes this contract and safe refusal of essential guarantees; its zero-compatibility policy supersedes historical compatibility wording. No unrelated active plan is part of this work.

The security boundary is enforced first: ordinary/guarded update and delete authorize exact stored state inside driver-owned exclusion, including asynchronous owner resolution and expected-value READ authorization. Native regressions queue replacement both before and after authorization, assert refusal after ownership changes, and inspect canonical state and raw postings. Existing denied matching/nonmatching guard guesses remain covered. Coordination covers item-dependent authorization; external role/policy/owner mappings require their own application coordination.

All indexed CRUD now uses exact before/after images under the same exclusion, including create overwrite cleanup and ordinary updates. Stale, missing and failing ordinary readers cannot corrupt these paths or reject their successful canonical mutations. Concurrent index writers cannot overtake each other. A failed sibling index write waits for every issued write to settle before exclusion ends, including synchronous writer throws. Identity changes remove old-identity postings; in-memory file rename collisions refuse before commit, and ambiguous create-at-alias requests explicitly refuse. Postcommit index failures retain their cause and expose `canonicalCommitted` without returning raw canonical images.

Cleanup holds exclusion across absence proof and structured/text deletion; recreation waits through successful or failed cleanup. Reindex and schema reconciliation use coordinated current state rather than ordinary snapshots. Tests assert canonical and raw structured/text state after recreation and failed maintenance. Index errors named `ITEM_NOT_FOUND` propagate; only the driver's expected absence after a completed callback is suppressed. Diagnostic strong reads are not cleanup authority. Wrappers forward configs, the relationship data driver inherits enforcement, route/client context positions remain unchanged, and the existing public barrels export the new contract/error. No driver capability registry remains in source, site or scripts.

The initial focused service/driver/route/health battery passed 37 cases. Added identity-change and failed-sibling-write checks pass in the native specs. A negative control temporarily restored fail-fast `Promise.all`; the delayed sibling regression failed (`failureReported` was true while full-text work was still pending). The repaired implementation was restored. The final full suite passes 1,047 core and 58 native cases, zero failures/errors. No alternate runner or simulator was added.

Fresh local verification on Node v24.22.0 / Yarn 1.22.22:

| Command | Observed result |
| --- | --- |
| `yarn install --frozen-lockfile` | Exit 0; already up to date; lockfile unchanged. |
| `yarn test` | Exit 0; 1,047 core + 58 native passes; zero failures/errors. |
| Focused ConditionalWrites, CanonicalConditions, ORMRouteMap and health native JSON specs | Exit 0; 37 passes; subsequent cleanup-error extension also passes all 12 conditional cases and the final full suite. |
| `yarn build` | Exit 0; bundles, declarations and package preparation. |
| `yarn site:build:demo-types` | Exit 0; generated metadata unchanged. |
| `yarn site:build:api` | Exit 0. |
| `yarn site:build:app` | Exit 0, including TypeDoc/finalization. |
| `yarn site:build:iac` | Exit 0; local generation only. |
| `yarn test:exports` | Exit 0; export validation. |
| `yarn test:consumer` | Exit 0; packed-package type/runtime/import checks. |
| `git diff --check` | Exit 0. |

Universal requirements are generic authorization/index semantics plus honor-or-refuse driver enforcement. Business consistency and conditions remain optional configured requests. In-memory stores supply exclusion; current DynamoDB/S3 drivers refuse indexed CRUD, DAC-sensitive mutations and coordinated reindex before I/O, while cleanup reports `maintenanceUnsupported`. This deliberately exposes an unavailable guarantee rather than weakening it. Non-indexed/non-DAC CRUD and supported read/condition requests remain available. SDK interception proves pre-I/O refusal and request construction, not live distributed behavior.

Canonical/index stores still have no shared transaction or rollback: canonical commit can precede index visibility, and crashes/failures can leave partial indexes requiring coordinated repair with known previous state. Raw administrative index helpers and external writers are outside this contract. No deployment, cloud integration, seeding, push, PR approval/merge or lifecycle settlement was performed. Owner commits f6da4a6c and 585627a remain ancestors. All checklist work is verified; this plan remains active until explicit owner acceptance.

## Full-text token batch settlement repair — 2026-10-27

The remaining review finding concerns nested token writes escaping canonical exclusion on failure. This repair preserves the current generic indexing contract and driver isolation.

- [x] Drain every issued fallback token mutation before propagating failure, including synchronous writer throws.
- [x] Add nearby native regressions with real memory postings, document-level writes disabled, delayed/rejected token siblings and queued canonical work.
- [x] Run relevant verification and record actual results; keep this plan active pending owner acceptance.

`indexDocument` and `removeDocument` now drain each lossy/exact token batch with `Promise.allSettled` before propagating the original rejection. Async per-token callbacks capture synchronous writer throws without abandoning issued siblings. Remove/add phase ordering remains intact; no shared driver contract or backend-specific generic code was introduced.

The nearby `runCoordinatedTokenFailures` native JSON regression disables optional `writeDocument` on the real memory full-text backend. Eight scenarios cover lossy/exact adds/removals with asynchronous rejection or synchronous throw after a delayed sibling was issued. Each asserts that failure reporting and a queued canonical writer remain blocked until settlement, committed-write errors preserve the cause, and raw lossy postings/exact positions match the latest canonical item. Removal scenarios restore the original tokens, exercising the reported late-deletion race. Addition scenarios replace attempted tokens and verify no delayed stale posting survives. Temporarily restoring the original API implementation produced 12 passes and 1 error in the new case (exit 1); the repair was restored before verification.

Fresh verification: focused ConditionalWrites JSON specs pass all 13 cases; `yarn test` passes 1,048 core and 58 native cases with zero failures/errors. `yarn build`, `yarn site:build:demo-types` with unchanged generated metadata, `yarn site:build:api`, `yarn site:build:iac`, and `yarn test:exports` all exit 0. The packed-package `yarn test:consumer` check also exits 0. The first site app run caught a missing required structured-search dependency in the new test setup during TypeDoc type checking; the setup now uses the existing memory structured backend. Focused and site checks were rerun after this correction. Existing dependencies were used; no manual dependency installation was performed.

Final focused rerun passes all 13 cases and `yarn site:build:app` exits 0, including TypeDoc and site finalization. Final `git diff --check` passes. Only generic token batch draining, its native regression and this existing planning record changed. The product plan remains active for explicit owner acceptance; independent-store partial failure/crash recovery limitations remain as documented. No cloud operations, deployment, seeding or PR lifecycle actions were performed.

## Practical backend-local guarantees — owner correction 2026-10-27

This section supersedes the earlier global-exclusion proposal and its cloud refusal claims, following the current owner correction on PR #424 (issuecomment-6453517452). The original #423 DynamoDB use case must work with generic indexing and DAC enabled.

- [x] Relax callback requirements; retain atomic canonical guards and bind DAC to schema-field snapshot checks at mutation commit.
- [x] Restore DynamoDB indexed/DAC CRUD using strong prior snapshots, atomic comparisons and returned mutation images; audit S3 and memory workflows.
- [x] Keep reindex/schema reconciliation available; limit refusal to destructive absence cleanup without recreation protection and specific unsupported atomic/security requests.
- [x] Replace blanket-refusal coverage with native behavioral workflows; update docs and run relevant framework verification.

Contract: existing CRUD configs retain server-only inspect/changed callbacks. Inspect authorizes a strong canonical snapshot; mutation drivers bind the inspected schema fields (including absence) to their atomic write. Changed consumes committed before/after images where available (strong metadata snapshots for file stores), with no global lock requirement. Memory may continue serializing internally. DynamoDB compares stored/schema fields at the canonical boundary and returns a conflict if another writer changes them. Read inspection/reindex uses strong current state but does not claim exclusion. Destructive orphan cleanup alone requests exclusion against recreation; missing cloud identities may explicitly refuse that specific action. Current identities remain reindexable. S3 ordinary indexed workflows use HEAD metadata; unsupported mutable-metadata DAC/atomic rename requirements must refuse explicitly rather than use an unbound authorization snapshot.

Canonical/index stores are independent. External writers, process crashes and cross-process callback ordering can leave indexes lagging or stale; existing health/reindex/manual previous-state repair remain necessary. Callback failures after commit retain canonicalCommitted and their cause. All issued index writes still drain before failure, preserving the previous token-settlement repair. No new storage verbs, capabilities registry, coordinator service or backend code outside drivers is introduced. The plan stays active pending explicit owner acceptance.


### Implemented behavior and verification

DynamoDB indexed create/overwrite uses PutItem ALL_OLD plus the submitted committed image. Indexed/DAC updates obtain one strong prior image, bind observed values and schema-field absence with atomic conditions, and index ALL_NEW without a post-write read. Delete binds DAC observations and consumes ALL_OLD. Concurrent schema/owner changes fail with a recognizable conflict before generic indexing. Item-backed owner resolvers can use the authoritative third canonicalItem argument rather than re-reading mutable ownership; external policy and owner mappings remain application responsibilities. The public CRUD/list surface, configs/wrappers, routes/client context positions, generic indexing algorithms and exports remain intact.

The replacement native regression uses one intercepted DynamoDB record and real structured/full-text memory indexes. It exercises ordinary/ifAbsent create, overwrite cleanup, ordinary/guarded update, strong authorized projection, actual indexed list/search, rejected writes, matching/nonmatching denied secret probes, ownership replacement between inspection and update/delete, postcommit index failure/cause, health verification, schema reconciliation and reindex recovery. Ordinary reads deliberately lag; successful mutations use one strong prior read and returned images. S3 coverage exercises indexed create/rename/delete/reindex, present-item repair, location-only inspection, specific mutable-metadata DAC refusal, and committed failure reporting. Its same-location update regression exposed a copy-onto-self/delete defect; omitted directories now preserve the source directory and avoid this destructive path. The existing memory data/relationship/file, denied-guard, stale-reader, concurrency/recreation and nested-token settlement regressions are retained.

Missing cloud identities specifically refuse destructive orphan cleanup without touching postings, since no canonical recreation protection exists; present identities are reindexed successfully. S3 business conditions and mutable-metadata DAC specifically refuse before writes; location-only DAC remains available. S3 HEAD images are strong snapshots, not transactional mutation images. Memory retains its internal queues. Independent cloud writers can reorder index follow-up, and crashes/external changes can require health/reindex/known-previous-state repair. There is no global exclusion, cross-store atomicity, rollback or live-AWS concurrency claim.

Fresh local verification (all final commands exit 0):

| Command | Observed result |
| --- | --- |
| Focused ConditionalWrites + CanonicalConditions native JSON specs | 18 passes, zero failures/errors. Final CanonicalConditions rerun after the TypeDoc fixture correction: 5 passes. |
| yarn test | 1,049 core + 58 native passes, zero failures/errors. |
| yarn build | Package bundles, declarations and preparation pass. |
| yarn site:build:demo-types | Pass; generated metadata unchanged. |
| yarn site:build:api | Pass. |
| yarn site:build:iac | Pass; local generation only. |
| yarn site:build:app | Pass, including TypeDoc/finalization. Initial TypeDoc run caught assertion-induced narrowing in the new helper; Object.assign preserves its record type, and the focused case and full site command pass after correction. |
| yarn test:exports | Export validation passes. |
| yarn test:consumer | Packed-package consumer checks pass. |
| git diff --check | Pass. |

Only the existing plan, indexing documentation, generic hook/DAC wiring and cloud drivers with nearby native behavioral coverage changed. No generated metadata drift, extra CRUD verbs, capability registry or backend mechanics in generic modules. Existing dependencies were used; the repository consumer check manages its own temporary installation. No cloud operations, deployment, seeding, service changes, commit, push, PR actions or lifecycle settlement. The owner's existing commits are retained, and this plan remains active for explicit acceptance.
