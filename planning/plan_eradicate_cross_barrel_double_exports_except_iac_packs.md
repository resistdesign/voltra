# Plan: Eradicate Cross‑Barrel Double Exports (Except `iac-packs`)

Goal: Find *all* exports that are re-exported across Voltra barrels (e.g. `app` re-exporting `common`, `api` re-exporting `app`, etc.), **report them**, and then (once approved) **remove/fix them** so each symbol has a single “home” barrel. The only allowed exception: **`iac-packs` barrels may export across barrels and more than once.**

Repo artifact: `voltra-main.zip`

---

## Phase 0 — Ground rules (codify first)

- [ ] Define “barrels” as top-level entrypoint domains (examples: `api`, `app`, `common`, `build`, `native`, `web`, `iac-packs/*`, etc.).
- [ ] Define “cross‑barrel export” as: a barrel `X` exporting from a file path that belongs to a different barrel `Y`.
- [ ] Rule: **No cross-barrel re-exports** anywhere **except** `iac-packs/*` barrels.
- [ ] Rule: Do not replace this with new “type-only convenience exports” — avoid the entire footgun.

Deliverable for this phase: a short “rules” note added to AGENTS / contributor guidance (if such guidance exists).

---

## Phase 1 — Inventory & report (NO CHANGES)

### 1.1 Identify all barrel entrypoints

- [ ] Enumerate entrypoint folders under `src/` that correspond to public package entrypoints.
- [ ] Enumerate each entrypoint’s `index.ts` (and any nested `index.ts` that acts like a public entrypoint).
- [ ] Record `iac-packs` structure and treat it as the only exception domain.

### 1.2 Detect cross-barrel re-exports

Scan patterns:

- `export * from "../..."`
- `export { X } from "../..."`
- `export type { X } from "../..."`

For each match:

- [ ] Capture **source file** (the barrel doing the re-export).
- [ ] Capture **target module path** (where it re-exports from).
- [ ] Resolve the target module to its owning barrel.
- [ ] Mark as **allowed** only if the source barrel is within `iac-packs/*`.

### 1.3 Produce a report

Deliverable: `docs/reports/cross-barrel-exports.md`

Include:

- [ ] Summary counts (total matches / allowed / disallowed).
- [ ] A table-like section per barrel:
  - file path
  - exported symbol(s) (if explicit)
  - target module
  - target barrel
  - classification: allowed (iac-packs) / disallowed
- [ ] A “high risk” list: anything that is a runtime value exported via `export type` (enums/consts/functions) and any name collisions.

Important: **No code edits** in Phase 1.

---

## Phase 2 — Fix plan proposal (still no code edits)

Based on the report, propose the minimal, consistent strategy:

- [ ] Remove all disallowed cross‑barrel re-exports.
- [ ] Ensure each symbol is imported from its owning barrel.
- [ ] Update docs/examples to use owning barrel imports.
- [ ] If any consumer-facing breakage is expected, list it explicitly (paths and symbols).

Deliverable: Add a short section to the report: “Proposed removals & expected breakages”.

---

## Phase 3 — Execute fixes (ONLY after approval)

### 3.1 Remove disallowed cross-barrel exports

- [ ] Delete/modify export statements so barrels only export their own domain symbols.
- [ ] Ensure `iac-packs/*` exception remains intact.

### 3.2 Repair internal imports

- [ ] Update Voltra internal imports so they reference the correct owning modules (prefer direct module paths inside `src/` rather than importing through a different barrel).

### 3.3 Repair public API usage in docs/examples

- [ ] Update README / docs / examples to import from the owning barrel.

### 3.4 Validate

- [ ] Typecheck
- [ ] Build all targets
- [ ] Generate docs (if applicable) and ensure links/sections still correct
- [ ] Run tests

---

## Definition of Done

- [ ] `docs/reports/cross-barrel-exports.md` exists and is complete.
- [ ] No disallowed cross-barrel re-exports remain.
- [ ] `iac-packs/*` cross-barrel exports remain (and only those).
- [ ] Build + typecheck pass.
- [ ] Docs/examples updated and consistent.

