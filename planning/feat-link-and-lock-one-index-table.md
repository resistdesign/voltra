# Feature: Link & Lock One Index Table

## Goal

Replace Voltra's ten physical indexing tables with one collision-safe, versioned DynamoDB table while preserving the structured, full-text, exact, relationship, pagination, sorting, and maintenance contracts established by the Link & Lock reference implementations.

## Phase 1: Contracts and design

- [x] Inventory every existing index-table access pattern and item shape.
- [x] Define one public `IndexTableConfig` configuration contract and compatibility boundary.
- [x] Define centralized constants and structural key factories for every index item kind.
- [x] Define identity encoding, sortable string/number encoding, key-size validation, and cursor behavior.
- [x] Document the range + unrelated-sort baseline and the deferred block-skipping optimization.

## Phase 2: Runtime implementation

- [x] Route structured term, range, and document-field records through the unified table.
- [x] Route lossy/exact postings, mirrors, token state, positions, and statistics through the unified table.
- [x] Route relationship edges through the unified table.
- [x] Update configuration validation, environment mapping, handlers, and public exports.
- [x] Preserve idempotent write, cleanup, rebuild, pagination, and retry behavior.

## Phase 3: In-memory parity and tests

- [x] Bring in-memory indexing capabilities to DynamoDB parity for supported criteria, ordering, pagination, and relationships.
- [x] Add collision tests for delimiters, Unicode, type/field/value identities, and physical attribute names.
- [x] Add sortable-value tests for strings and numeric edge cases.
- [x] Add unified-table request-shape and mixed-index-kind isolation tests.
- [x] Add maintenance, pagination, range + sort, and failure-path regressions.

## Phase 4: IaC, demos, and consumer migration

- [x] Replace the demo site's ten index resources/env vars with one index table.
- [x] Update E2E/demo setup and add useful one-table scenarios.
- [x] Clean existing guides, examples, samples, comments, and generated-facing contracts.
- [x] Prepare the Engayge cloud/mobile migration guide as a separate consumer artifact; do not commit it to Voltra.
- [x] Ensure API consumers can import every involved public type and key/config utility intended for them.

## Phase 5: Validation and publication

- [x] Run focused indexing, ORM, IaC, demo, and export tests.
- [x] Run the complete test suite, build, type build, docs, and site/demo builds.
- [x] Review the complete diff for correctness, compatibility, key limits, hot paths, and stale multi-table references.
- [x] Publish the committed branch and open a professional draft PR targeting `feat/link-and-lock`.

## Scope notes

- The one-table implementation is the production direction, while PR #388 remains the behavioral reference implementation.
- Data-skipping blocks are documented and shaped for future addition, but are not materialized unless required to preserve current correctness.
- URI-component encoding may be used only where it provides collision-safe identity encoding. Sortable value encoders must preserve the comparison contract instead.
