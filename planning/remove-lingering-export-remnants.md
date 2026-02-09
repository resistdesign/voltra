# Plan: Remove ALL deprecated code + deprecated namespace layers + fix documentation structure

## Historical Context (DO NOT SKIP)

The current issues happened as a result of the plan `planning/complete/nuclear-export-cleanup.md`. The exports should
not have remained and never needed to be marked as deprecated.

That plan intentionally:

- Eliminated multi-level / nested export topologies
- Enforced **domain-flat entrypoints**
- Collapsed legacy namespace-based APIs that never shipped publicly

However:

- Some *deprecated namespaces* and *deprecated symbols* still exist in code
- They never saw public release
- They exist ONLY as remnants of the pre–nuclear-export shape
- TypeDoc is correctly surfacing them — which is how we know they must be deleted

**Important rule:**  
There are NO valid deprecations in this repo.  
Anything marked deprecated — *or that exists only to preserve a deprecated export shape* — must be removed entirely.

---

## North Star

- Zero deprecated symbols
- Zero deprecated namespaces
- Zero legacy export layers
- Public API matches post–Nuclear Export Cleanup reality
- Documentation is structured, scannable, and honest

---

## Phase 1 — Nuclear purge (code + export topology)

> Treat “deprecated” as “never should have existed publicly”

### 1A — Delete deprecated symbols

- [x] Repo-wide removal of:
  - `@deprecated` doc tags
  - deprecated helper types
  - deprecated re-export stubs
- [x] If a symbol is marked deprecated → **delete it**
- [x] If still needed internally → move to internal-only module and stop exporting

### 1B — Delete deprecated namespace layers (critical)

These are the real problem.

- [x] Identify legacy namespace exports introduced *before* Nuclear Export Cleanup:
  - `export * as X from "./X"`
  - namespace-style barrels whose sole purpose is grouping
  - type-only mirrors recreating old paths
- [x] For each namespace:
  - [x] If it only exists to preserve an old import shape → **delete it**
  - [x] If it wraps real APIs → promote those APIs domain-flat and delete the wrapper anyway
- [x] Remove all re-exports of these namespaces from:
  - domain entrypoints
  - root barrels
  - package `exports` maps

**Rule:** If it recreates a pre–nuclear-export path, it must go.

---

## Phase 2 — Ensure deprecated paths cannot reappear

- [x] Audit all `src/*/index.ts` entrypoints
- [x] Ensure they export ONLY the post-cleanup domain-flat surface
- [x] Confirm no deep subpath exports expose removed namespaces

---

## Phase 3 — Fix the “scroll fest” documentation

The scroll issue is a *secondary symptom* of correct exports with no structure.

### 3A — Sidebar organization

- [x] Apply `@category` consistently across domains:
  - api
  - app
  - common
  - web
  - native
  - iac
  - build
- [x] Enable category-based navigation in TypeDoc config
- [x] Define explicit `categoryOrder`

### 3B — In-page structure

- [x] Use `@group` to break large domain pages into logical sections
- [x] Define `groupOrder` so pages read intentionally

### 3C — Prevent mega-pages

- [x] If a domain entrypoint renders as a single massive page:
  - split internal modules
  - keep domain-flat exports
  - let TypeDoc render multiple grouped sections instead of one list

---

## Phase 4 — Verification gates

- [x] `yarn build`
- [x] `yarn doc`
- [x] Confirm:
  - no deprecated badges or sections
  - no legacy namespace objects in docs
  - sidebar reflects domain structure
  - worst pages are sectioned and readable

---

## Phase 5 — IaC pack export boundary hardening

- [x] Remove pack re-exports from `@resistdesign/voltra/iac`
- [x] Keep pack exports only under `@resistdesign/voltra/iac/packs`
- [x] Update docs/examples/tests/scripts to import packs from `@resistdesign/voltra/iac/packs`
- [x] Re-run verification:
  - [x] `yarn build`
  - [x] `yarn test:exports`
  - [x] `yarn test`

---

## Run Status

- [x] Complete (awaiting user approval to move this plan to `planning/complete/`)

---

## Success Criteria

- Documentation reflects **only** the post–Nuclear Export Cleanup API
- No historical ghosts
- No fake deprecations
- No misleading namespaces
- No scroll-wall pages
