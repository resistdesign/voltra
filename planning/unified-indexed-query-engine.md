# Unified Indexed Query Engine

## Goal

Replace Voltra's separate structured-search and full-text ORM paths with one
capability-driven indexed query engine. This is an intentional alpha-stage
breaking refactor: obsolete APIs, configuration, cursors, routing, examples,
and documentation must be removed rather than preserved through aliases.

The complete architectural requirements and acceptance criteria are defined by
the user-supplied `VOLTRA_UNIFIED_INDEX_QUERY_PLAN.md`. This checklist is the
repository's live execution state for that plan.

## Phase 1 — Contract and compiler

- [x] Define unified expressions, semantic text modes, candidates,
      diagnostics, limits, and versioned cursors.
- [x] Replace split indexing configuration and generated field maps with one
      TypeInfo-derived capability model.
- [x] Replace `criteriaToStructuredWhere` with a deterministic
      `criteriaToIndexExpression` compiler covering every supported operator.
- [x] Add compiler, expression, and contract specs for supported requests and
      explicit rejection of unsupported capabilities.

## Phase 2 — Query engine

- [x] Generalize term, membership, range, occupancy, exact-text,
      and lossy-text readers behind common leaf execution.
- [x] Execute nested mixed `AND` and `OR` trees with deterministic candidate
      intersection/union, membership filtering, deduplication, and budgets.
- [x] Implement one cursor envelope with query, plan, tokenizer, ordering, and
      index-generation fingerprints.
- [x] Preserve global ordering and occupancy optimization; reject unsupported
      ordering explicitly.
- [x] Add semantic, pagination, cursor, ordering, budget, and backend-parity
      specs.

## Phase 3 — ORM and mutation integration

- [x] Route ORM lists only through canonical listing, unified indexed search,
      or explicit scan-and-compare fallback.
- [x] Centralize canonical criteria matching and refill after approximate
      mismatch, stale/missing records, or DAC rejection.
- [x] Replace split route diagnostics with indexed-plan diagnostics.
- [x] Build one TypeInfo-capability-driven mutation plan across every physical
      index record family.
- [x] Remove duplicate structured/full-text maintenance and planning paths.
- [x] Add ORM, mutation, rebuild, stale-record, DBX, and backend-parity
      coverage.

## Phase 4 — Cleanup and validation

- [x] Rename common query modules and public exports to unified terminology.
- [x] Remove old split configuration, resolvers, query orchestration APIs,
      cursor formats, and compatibility aliases.
- [x] Rewrite architecture docs and migration guidance.
- [x] Update examples, demos, samples, IaC utilities, package exports, TypeDoc,
      and documentation-site imports.
- [x] Pass core/native tests, build, consumer/export checks, docs generation,
      and relevant DBX suites.

## Acceptance

- [x] All acceptance criteria in the supplied architecture plan are satisfied
      at the public API, ORM, demo, and package-validation boundaries.
- [x] The PR contains no remaining top-level structured-versus-full-text query
      routing or configuration choice.
