# Structured Term Index Production Design Plan

## Goal

**Reduce structured term-index fanout and cost _WHILE PRESERVING SEARCH ACCURACY_**, using configuration-first controls
driven
by `TypeInfo` metadata, data type, array designation, and search operators.

## Scope Constraints

- Do not implement any runtime/code behavior changes yet. (**Once approved, changes will be implemented.**)
- Produce an execution-ready plan only.
- Prioritize config~~/policy~~ controls first.
- Do not reduce query correctness for supported search behavior. **EXACTLY RIGHT**
- Do not hardcode specific field names in logic. **OBVIOUS FOR AN ORM**

## Clarifications (Authoritative)

- `primaryField` must always come from `TypeInfo` at runtime. Field name strings are examples only, never hardcoded
  assumptions. **YES**
- Indexing/search behavior signifier is the pair: `Data Type (+ array/non-array)` x `Search Operator`. **YES**
- Field names in this plan are illustrative examples only for discussion. **YES**

## Assumptions From User Feedback

- [ ] Primary field tokenization concern is primarily a configuration/policy issue. **YES**
- [ ] Field-mode behavior should be adjustable by ~~config before~~ algorithmic changes. **Behavior is determined by
  Type/Operator. Field is only indexed if it is set in the config.**
- [ ] Tokenizer improvements are ~~interesting but secondary.~~ **INTERESTING AND PRIMARY** (That's the main point of
  this plan!!!)
- [ ] Accuracy should not be reduced. **EXACTLY RIGHT**
- [ ] Concurrency hardening is separate and optional for this track. (If it's easy and helps and doesn't break anything,
  do it.)
- [ ] Opt-in indexed fields is ~~likely desirable.~~ IMPERATIVE.

## Phase 1: Baseline & Policy Design (No behavior change)

- [ ] Define explicit structured indexing policy model keyed by `typeName` + `field metadata`, not literal field names.
- [ ] Define policy primitives based on field traits:
- [ ] scalar `string` (non-array)
- [ ] scalar `number` (non-array)
- [ ] scalar `boolean` (non-array)
- [ ] array fields by element type **(TypeInfoField designates whether or not a field is an array.)**
- [ ] Define operator support policy by type/operator pair.
- [ ] Define default policy: opt-in fields for structured indexing, no implicit all-field indexing. **CORRECT**
- [ ] Define migration-compatible fallback for existing configs (feature flag or versioned default).
- [ ] Produce expected fanout estimates using current seed data under policy variants.

### Phase 1 Acceptance

- [ ] Written policy schema draft exists.
- [ ] ~~Backward-compatibility strategy exists.~~ **WE DO NOT NEED TO BE BACKWARDS COMPATIBLE. THIS IS AN ALPHA RELEASE
  PROJECT RIGHT NOW**
- [ ] Estimated entry-count reduction is quantified for demo seed data.

## Phase 2: Type/Operator Matrix Contract

- [ ] Define canonical matrix for allowed indexed behavior by `field type (+ array)` x `operator`.
- [ ] Explicitly map each supported `ComparisonOperators` value to index path requirements.
- [ ] Specify behavior when operator is valid generally but not enabled/indexed for a specific field.
- [ ] Specify behavior when field is not indexed at all.
- [ ] Define exact criteria translation rules so unsupported type/operator pairs fail predictably.

### Example Matrix Shape (Illustrative)

- [ ] `string` scalar:
- [ ] `EQUALS` -> term `eq` candidate
- [ ] `CONTAINS` / `LIKE` -> term `contains` candidate when enabled
- [ ] `STARTS_WITH` (if used) -> future mode/policy, not assumed
- [ ] `number` scalar:
- [ ] `EQUALS` -> term/range exact path (as designed)
- [ ] `BETWEEN`, `>=`, `<=` -> range path
- [ ] `boolean` scalar:
- [ ] `EQUALS` only
- [ ] array fields:
- [ ] `CONTAINS` semantics only where element type is supported and ~~policy-enabled~~ (Consumers will NOT configure by
  operator or policy, we simply turn indexing ON/OFF BY FIELD NAME.)

### Phase 2 Acceptance

- [ ] Final type/operator contract documented with examples.
- [ ] Deterministic unsupported-case behavior documented.
- [ ] Criteria translation alignment documented.

## Phase 3: Config Surface & Wiring Plan

- [ ] Add plan for config shape in ORM indexing settings (global defaults + per-type + per-field overrides).
- [ ] Define exact precedence rules:
- [ ] global defaults
- [ ] per-type overrides
- [ ] per-field overrides
- [ ] Ensure policy resolution receives runtime `TypeInfo` field metadata, including `primaryField` designation.
- [ ] Define telemetry/counters needed to verify index growth by type/operator class.

### Phase 3 Acceptance

- [ ] Final config contract documented with examples.
- [ ] Deterministic precedence and fallback rules documented.
- [ ] Observability requirements documented.

## Phase 4: Accuracy Preservation Plan

- [ ] Enumerate required search correctness by operator.
- [ ] Define no-regression expectations per type/operator pair.
- [ ] Define validation rules preventing invalid config combinations for a field's type/array shape.
- [ ] Define test strategy proving no false negatives for all supported type/operator pairs.
- [ ] Define rollout validation for query-result parity on key demo scenarios.

### Phase 4 Acceptance

- [ ] Type/operator correctness matrix completed.
- [ ] Validation/error semantics fully specified.
- [ ] Test plan includes parity checks for expected behavior.

## Phase 5: Optional Enhancements (Defer unless needed)

- [ ] Tokenizer tuning plan (only if required after policy optimization):
- [ ] evaluate token strategies by field class while preserving declared semantics
- [ ] maintain strict correctness guarantees for supported operator behavior
- [ ] evaluate per-field token budget controls only where they do not violate correctness goals
- [ ] Concurrency hardening track (separate): transactional/versioned index update strategy.

### Phase 5 Acceptance

- [ ] Optional tracks have clear success criteria and isolated scope.

## Phase 6: Delivery Plan

- [ ] Implement config contract and defaults.
- [ ] Implement policy resolution from `TypeInfo` + field traits + operator.
- [ ] Implement structured field-selection/indexing gating based on resolved policy.
- [ ] Add/extend tests for policy behavior and unsupported criteria handling.
- [ ] Add docs: production guidance + migration notes + examples (explicitly examples, not hardcoded assumptions).
- [ ] Run full relevant specs and capture before/after fanout metrics.

### Phase 6 Acceptance

- [ ] Tests pass for structured + ORM criteria integration.
- [ ] Fanout reduction meets target with no supported-query regressions.
- [ ] Documentation includes safe defaults and migration notes.

## Example Defaults (Illustrative Only, Not Hardcoded)

- [ ] `primaryField` resolved from `TypeInfo`: default `eq` only.
- [ ] scalar string fields intended for substring search: `eq` + optional `contains`.
- [ ] scalar string fields intended for exact matching identifiers/contact values: `eq` only by default.
- [ ] scalar number/boolean fields: exact/range behavior as allowed by type/operator matrix.

## Open Decisions Requiring Your Approval Before Implementation

- [ ] Whether non-indexed-field criteria should fallback to driver scan/filter or ~~return explicit
  unsupported-indexed-query error~~. **FALLBACK TO SCAN+COMPARE**
- [ ] ~~Whether to keep backward compatibility mode enabled by default for one release.~~ **ALPHA PROJECT, NO BACKWARDS
  COMPATIBILITY, THIS PROJECT SHOULD NOT CONTAIN DEPRECATION WARNINGS OR DOC COMMENT ANNOTATIONS ANYWHERE (I should not
  find any of that, anywhere.)**
- [ ] Whether `contains` should ever be enabled by default for identifier/contact-style string fields. **WHY!!?!?!!?!? I
  DON'T KNOW WHAT THIS MEANS.**

## Deliverables For Next Execution Turn (When You Approve)

- [ ] Config contract update. **IF FIELDS AREN'T CONFIGURED, THEY'RE NOT INDEXED**
- [ ] Type/operator policy resolution update. **What does this mean?**
- [ ] Structured indexing gating update. **What does this mean?**
- [ ] Tests for policy behavior and parity. **YES**
- [ ] Documentation ~~and migration notes.~~ **Documentation only, this project is alpha.**
- [ ] Detailed and explicit Examples and Samples that make indexing semantics CLEAR and give a GREAT starting point for
  configuration.
