# Conditional canonical ORM writes and strong reads

Owner request: https://github.com/resistdesign/voltra/issues/423

Goal: expose reusable conditional canonical CRUD and required strong reads through normal ORM validation/access control, preserving existing defaults and backend isolation.

- [x] Add shared conditional-create/update/read contracts and atomic supported-driver enforcement with explicit unsupported behavior.
- [x] Wire service, routes and client without shifting existing server context arguments; review neighboring consumers.
- [x] Add nearby native JSON behavioral specs for conflicts, missing/stale updates, indexing safety, strong-read authorization/projection, forwarding and recovery; document backend guarantees and partial-success recovery.
- [x] Run locked dependency install, tests, generated demo metadata check, package/demo API/app/IaC builds, exports and consumer checks; local verification complete, including the authorization repair below. Independent configured checks and owner acceptance remain separate.
- [x] Review scope and make one focused commit. Owner acceptance remains pending.

## Design and verification notes

The original issue and current source agree on the gap. Optional driver methods advertise enforceable capabilities; legacy/file drivers must never receive a conditional request as an unconditional write. Conditions compare scalar field values and always require an existing update target. Strong-read config is appended after the existing server context argument; the client-safe API forwards it without accepting context. Canonical and index writes remain separate operations.

## Implementation review

Generic create/read options and update guards are exported through the existing common barrel. Driver capabilities are optional; DynamoDB and in-memory data drivers implement them, file and legacy drivers are refused before mutation. In-memory relationship drivers inherit support; indexing relationship adapters, HealthStore, list/maintenance helpers and app hook wrappers retain their contracts. Route handlers preserve server-owned context; operator filtering preserves guards. The error wrapper now binds the receiver, preserves supported optional methods, and enriches asynchronous rejections while retaining their message. Existing maintenance reindex consequently retains its preferred strong reader through the wrapper.

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
