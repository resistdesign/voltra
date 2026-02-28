# Structured Term Index Production Design Plan

## Goal
Reduce structured term-index fanout and cost while preserving search accuracy, using explicit field configuration and deterministic indexing/search behavior driven by `TypeInfo` / `TypeInfoField` definitions and `ComparisonOperators` semantics.

## Scope Constraints
- Do not implement any runtime/code behavior changes yet.
- Produce an execution-ready plan only.
- Do not hardcode any field names.
- Do not reduce query correctness for supported search behavior.
- This project is alpha: no backward-compatibility/deprecation track is required in this plan.

## Clarifications (Authoritative)
- `TypeInfo` is not metadata; it is an instruction set and type definition for data handling, security, routing, and related behavior.
- `TypeInfoField` is not metadata; it is the field-level definition source, including scalar type and array designation.
- `primaryField` must always be resolved from runtime `TypeInfo`, never from hardcoded field names.
- Field names appearing in examples are examples only.
- Index inclusion is configured by field name (ON/OFF at field level).
- Consumer configuration controls field inclusion only; it does not redefine operator semantics.
- Once a field is included, indexing and search behavior is determined by framework-defined `Type (+ array designation) x Operator` rules.

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
- [ ] Define explicit config contract for structured indexing field inclusion.
- [ ] Define Type/Operator matrix contract using `TypeInfoField` shape:
- [ ] scalar `string`
- [ ] scalar `number`
- [ ] scalar `boolean`
- [ ] array fields by element type
- [ ] Define deterministic fallback rule to scan+compare for non-indexed fields/operators.
- [ ] Quantify current fanout baseline and projected fanout under proposed field-inclusion defaults.

### Phase 1 Acceptance
- [ ] Config contract draft exists.
- [ ] Type/Operator matrix draft exists.
- [ ] Baseline and projected fanout estimates exist.

## Phase 2: Type/Operator Matrix Finalization
- [ ] Map each supported `ComparisonOperators` value to allowed behavior by type/array shape.
- [ ] Define criteria translation outcomes for each valid Type/Operator combination.
- [ ] Define explicit invalid-combination handling.
- [ ] Define array behavior per operator (`CONTAINS`, `IN`, etc.) with unambiguous semantics.

### Example Matrix Shape (Illustrative Only)
- [ ] scalar `string`: `EQUALS` -> term `eq`; `CONTAINS`/`LIKE` -> term `contains` when field is indexed.
- [ ] scalar `number`: `EQUALS` -> exact path; `BETWEEN`/`>=`/`<=` -> range path when field is indexed.
- [ ] scalar `boolean`: `EQUALS` semantics when field is indexed.
- [ ] array fields: operator handling based on element type and operator definition.

### Phase 2 Acceptance
- [ ] Final Type/Operator matrix documented.
- [ ] Criteria translation contract documented.
- [ ] Invalid-combination handling documented.

## Phase 3: Config Surface & Resolution Rules
- [ ] Define final config structure for field inclusion by type.
- [ ] Define precedence rules (global defaults, per-type overrides, per-field overrides).
- [ ] Define resolution flow: field inclusion check -> Type/Operator rule -> indexed query path or scan+compare fallback.
- [ ] Define observability counters for index growth and fallback usage.

### Phase 3 Acceptance
- [ ] Final config schema documented.
- [ ] Resolution/precedence rules documented.
- [ ] Observability requirements documented.

## Phase 4: Accuracy Preservation Plan
- [ ] Define no-regression requirements per Type/Operator pair.
- [ ] Define test matrix for indexed paths and fallback scan+compare paths.
- [ ] Define parity checks ensuring supported query results remain correct.
- [ ] Define tokenizer correctness expectations for `contains` semantics.

### Phase 4 Acceptance
- [ ] Accuracy matrix complete.
- [ ] Test matrix complete.
- [ ] Parity-check criteria complete.

## Phase 5: Tokenizer Strategy (Primary)
- [ ] Evaluate tokenizer approach for indexed string fields to reduce fanout while preserving required semantics.
- [ ] Compare candidate token strategies against correctness requirements.
- [ ] Define acceptance threshold balancing fanout reduction and accuracy.
- [ ] Select strategy and define implementation/test scope.

### Phase 5 Acceptance
- [ ] Selected tokenizer strategy documented.
- [ ] Fanout/accuracy tradeoff documented.
- [ ] Implementation scope approved.

## Phase 6: Delivery Plan (When approved)
- [ ] Implement config contract for field inclusion.
- [ ] Implement Type/Operator resolution flow.
- [ ] Implement scan+compare fallback for non-indexed paths.
- [ ] Implement tokenizer changes (if approved in Phase 5).
- [ ] Add/extend tests for matrix behavior, fallback behavior, and parity.
- [ ] Add documentation with explicit examples and configuration starter patterns.

### Phase 6 Acceptance
- [ ] Structured + ORM criteria tests pass.
- [ ] Fanout reduction target met.
- [ ] Supported-query correctness preserved.
- [ ] Documentation examples are clear and complete.

## Open Decisions For Review
- [ ] Final default field-inclusion profile by type.
- [ ] Final tokenizer strategy selection after Phase 5 evaluation.
- [ ] Whether to include any small/safe concurrency hardening in-scope.

## Deliverables For Next Execution Turn (After Approval)
- [ ] Config contract update.
- [ ] Type/Operator resolution update.
- [ ] Field-inclusion gating update.
- [ ] Fallback scan+compare update.
- [ ] Test additions/updates.
- [ ] Documentation with explicit examples.
