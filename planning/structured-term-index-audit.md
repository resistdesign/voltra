# Structured Term Index Production Design Plan

## Goal

Reduce structured term-index fanout and cost while preserving search accuracy, using explicit field configuration and
deterministic indexing/search behavior driven by `TypeInfo` / `TypeInfoField` definitions and `ComparisonOperators`
semantics.

## Scope Constraints

- Execution approved: runtime/code behavior changes are in scope.
- Maintain execution discipline against this plan.
- Do not hardcode any field names.
- Do not reduce query correctness for supported search behavior.
- This project is alpha: no backward-compatibility/deprecation track is required in this plan.

## Clarifications (Authoritative)

- `TypeInfo` is not metadata; it is an instruction set and type definition for data handling, security, routing, and
  related behavior.
- `TypeInfoField` is not metadata; it is the field-level definition source, including scalar type and array designation.
- `primaryField` must always be resolved from runtime `TypeInfo`, never from hardcoded field names.
- Field names appearing in examples are examples only.
- Index inclusion is configured by field name (ON/OFF at field level).
- Consumer configuration controls field inclusion only; it does not redefine operator semantics.
- Once a field is included, indexing and search behavior is determined by framework-defined
  `Type (+ array designation) x Operator` rules.

## Core Design Principle

- Step 1: Determine whether a field is indexed from config.
- Step 2: If indexed, apply deterministic Type/Operator behavior.
- Step 3: If not indexed, use fallback scan+compare behavior.

## Assumptions From User Feedback

- [x] Primary-field tokenization concern is config-driven.
- [x] Opt-in indexing by field is imperative.
- [x] Tokenizer strategy is a primary concern in this effort.
- [x] Accuracy must be preserved.
- [x] Concurrency hardening is separate unless it is small/safe/non-breaking.
- [x] Unsupported indexed path should fallback to scan+compare.

## Phase 1: Baseline & Contract Definition (No behavior change)

- [x] Define explicit config contract for structured indexing field inclusion.
- [x] Define Type/Operator matrix contract using `TypeInfoField` shape:
- [x] scalar `string`
- [x] scalar `number`
- [x] scalar `boolean`
- [x] array fields by element type
- [x] Define deterministic fallback rule to scan+compare for non-indexed fields/operators.
- [x] Quantify current fanout baseline and projected fanout under proposed field-inclusion defaults.

### Phase 1 Acceptance

- [x] Config contract draft exists.
- [x] Type/Operator matrix draft exists.
- [x] Baseline and projected fanout estimates exist.

## Phase 2: Type/Operator Matrix Finalization

- [x] Map each supported `ComparisonOperators` value to allowed behavior by type/array shape.
- [x] Define criteria translation outcomes for each valid Type/Operator combination.
- [x] Define explicit invalid-combination handling.
- [x] Define array behavior per operator (`CONTAINS`, `IN`, etc.) with unambiguous semantics.

### Example Matrix Shape (Illustrative Only)

- [x] scalar `string`: `EQUALS` -> term `eq`; `CONTAINS`/`LIKE` -> term `contains` when field is indexed.
- [x] scalar `number`: `EQUALS` -> exact path; `BETWEEN`/`>=`/`<=` -> range path when field is indexed.
- [x] scalar `boolean`: `EQUALS` semantics when field is indexed.
- [x] array fields: operator handling based on element type and operator definition.

### Phase 2 Acceptance

- [x] Final Type/Operator matrix documented.
- [x] Criteria translation contract documented.
- [x] Invalid-combination handling documented.

## Phase 3: Config Surface & Resolution Rules

- [x] Define final config structure for field inclusion by type.
- [x] Define precedence rules (global defaults, per-type overrides, per-field overrides).
- [x] Define resolution flow: field inclusion check -> Type/Operator rule -> indexed query path or scan+compare
  fallback.
- [x] Define observability counters for index growth and fallback usage.

### Phase 3 Acceptance

- [x] Final config schema documented.
- [x] Resolution/precedence rules documented.
- [x] Observability requirements documented.

## Phase 4: Accuracy Preservation Plan

- [x] Define no-regression requirements per Type/Operator pair.
- [x] Define test matrix for indexed paths and fallback scan+compare paths.
- [x] Define parity checks ensuring supported query results remain correct.
- [x] Define tokenizer correctness expectations for `contains` semantics.

### Phase 4 Acceptance

- [x] Accuracy matrix complete.
- [x] Test matrix complete.
- [x] Parity-check criteria complete.

## Phase 5: Tokenizer Strategy (Primary)

- [x] Evaluate tokenizer approach for indexed string fields to reduce fanout while preserving required semantics.
- [x] Compare candidate token strategies against correctness requirements.
- [x] Define acceptance threshold balancing fanout reduction and accuracy.
- [x] Select strategy and define implementation/test scope.

### Phase 5 Acceptance

- [x] Selected tokenizer strategy documented.
- [x] Fanout/accuracy tradeoff documented.
- [x] Implementation scope approved.

## Phase 6: Delivery Plan (When approved)

- [x] Implement config contract for field inclusion.
- [x] Implement Type/Operator resolution flow.
- [x] Implement scan+compare fallback for non-indexed paths.
- [ ] Implement tokenizer changes (if approved in Phase 5).
- [x] Add/extend tests for matrix behavior, fallback behavior, and parity.
- [x] Add documentation with explicit examples and configuration starter patterns.

### Phase 6 Acceptance

- [x] Structured + ORM criteria tests pass.
- [x] Fanout reduction target met (estimate-based for demo seed profile).
- [x] Supported-query correctness preserved.
- [x] Documentation examples are clear and complete.

## Open Decisions For Review

- [ ] Final default field-inclusion profile by type.
- [ ] Final tokenizer strategy selection after Phase 5 evaluation.
- [ ] Whether to include any small/safe concurrency hardening in-scope.

## Deliverables For Next Execution Turn (After Approval)

- [x] Config contract update.
- [x] Type/Operator resolution update.
- [x] Field-inclusion gating update.
- [x] Fallback scan+compare update.
- [x] Test additions/updates.
- [x] Documentation with explicit examples.
- [x] Examples in the `examples` folder.

## Execution Notes (Current Run)
- [x] Implemented `indexing.structured.indexedFieldsByType` contract and routing/write gating.
- [x] Implemented Type/Operator structured eligibility checks with scan+compare fallback.
- [x] Added tests for configured-field structured usage, non-indexed-field fallback, and non-`id` primary field behavior.
- [x] Added demo configuration with explicit indexed fields by type.
- [x] Added integration contract documentation updates.
- [x] Added `examples/api/orm-structured-indexing.ts` and linked it from `examples/README.md`.
- [x] Added list-routing observability hook example.
- [x] Added structured index-write observability hook (`onStructuredIndexWrite`) and test coverage.
- [x] Computed demo-seed fanout estimate:
- [x] baseline total term entries: `80,159`
- [x] proposed total term entries: `16,510`
- [x] estimated reduction: `63,649` entries (`79.4%`)
- [x] Evaluated tokenizer candidates for current indexed-field profile:
- [x] `1-3gram` total: `16,510` (selected default for correctness)
- [x] `2-3gram` total: `10,869` (34.17% lower than `1-3gram`, but higher risk to short-substring behavior)
- [x] `3gram` total: `5,636` (65.86% lower than `1-3gram`, but materially higher correctness risk)
