# Plan: Eradicate Cross‑Barrel Double Exports (Except `iac-packs`)

Context: `TypeOperation` is exported properly from the `common` barrel as an enum. But it is also exported from the
`app` barrel as a type. This kind of mistake breaks import functionality for consumers and must be repaired.

Goal: Find *all* exports that are re-exported across Voltra barrels (e.g. `app` re-exporting `common`, `api`
re-exporting `app`, etc.), **report them**, and then (once approved) **remove/fix them** so each symbol has a single
“home” barrel. The only allowed exception: **`iac-packs` barrels may export across barrels and more than once.**

Repo artifact: `voltra-main.zip`

---

## Phase 0 — Ground rules (codify first)

- [ ] Define “barrels” as top-level entrypoint domains (examples: `api`, `app`, `common`, `build`, `native`, `web`,
  `iac-packs/*`, etc.).
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
- [ ] A “high risk” list: anything that is a runtime value exported via `export type` (enums/consts/functions) and any
  name collisions.

Important: **No code edits** in Phase 1.

### 1.4 Approval checklist (line-item decisions)

Cross-barrel export declarations discovered across `src/**/*.ts` and `src/**/*.tsx`:

- [ ] `src/api/ORM/drivers/common/index.ts:9` exports `ListItemsConfig, ListItemsResults` from `src/common/SearchTypes`
- [ ] `src/api/ORM/drivers/common/index.ts:18` exports `TypeInfoDataItem, TypeInfoPack` from
  `src/common/TypeParsing/TypeInfo`
- [ ] `src/api/ORM/drivers/index.ts:14` exports `ListRelationshipsConfig, SearchCriteria` from
  `src/common/SearchTypes`
- [ ] `src/api/ORM/drivers/index.ts:23` exports `TypeInfoMap` from `src/common/TypeParsing/TypeInfo`
- [ ] `src/api/ORM/index.ts:14` exports `DeleteRelationshipResults, ORMOperation, RelationshipOperation, TypeInfoORMAPI, TypeInfoORMContext` from `src/common/TypeInfoORM/Types`
- [ ] `src/api/ORM/index.ts:26` exports `LiteralValue, TypeInfo, TypeInfoField, TypeOperation` from
  `src/common/TypeParsing/TypeInfo`
- [ ] `src/api/ORM/index.ts:37` exports `CustomTypeInfoFieldValidatorMap, TypeInfoValidationResults` from
  `src/common/TypeParsing/Validation`
- [ ] `src/app/forms/core/index.ts:19` exports `LiteralValue, TypeInfoDataItem, TypeInfoField` from
  `src/common/TypeParsing/TypeInfo`
- [ ] `src/app/forms/index.ts:34` exports `LiteralValue, TypeInfo, TypeInfoDataItem, TypeInfoField, TypeOperation`
  from `src/common/TypeParsing/TypeInfo`
- [ ] `src/app/utils/index.ts:31` exports `ListItemsConfig, ListItemsResults, ListRelationshipsConfig` from
  `src/common/SearchTypes`
- [ ] `src/app/utils/index.ts:41` exports `DeleteRelationshipResults, TypeInfoORMAPIRoutePaths, TypeInfoORMClientAPI, TypeInfoORMServiceError` from `src/common/TypeInfoORM/Types`
- [ ] `src/app/utils/index.ts:52` exports `TypeInfoDataItem` from `src/common/TypeParsing/TypeInfo`
- [ ] `src/native/utils/index.ts:7` exports `*` from `src/app/utils/History`
- [ ] `src/web/utils/Route.tsx:33` exports `RouteAdapter, RouteContextType, RouteProps, RouteProviderProps, RouteQuery, RouteQueryValue` from `src/app/utils/Route`
- [ ] `src/iac-packs/index.ts:6` exports `*` from `src/iac/packs` (allowed exception domain)

Current public double-exports across top-level package entrypoints:

- [ ] `buildHistoryPath` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `createHistoryBackHandler` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `createMemoryHistory` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `HistoryController` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `HistoryEntry` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `HistoryListener` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `HistoryLocation` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `HistoryPathParts` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `parseHistoryPath` exposed by `app` + `native` (declared in `src/app/utils/History.ts`)
- [ ] `RouteAdapter` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `RouteContextType` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `RouteProps` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `RouteProviderProps` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `RouteQuery` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `RouteQueryValue` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `RouteRuntimeIntegration` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `useRouteContext` exposed by `app` + `native` (declared in `src/app/utils/Route.tsx`)
- [ ] `CustomTypeInfoFieldValidatorMap` exposed by `api` + `common` (declared in
  `src/common/TypeParsing/Validation.ts`)
- [ ] `DeleteRelationshipResults` exposed by `api` + `app` (declared in `src/common/TypeInfoORM/Types.ts`)
- [ ] `ListItemsConfig` exposed by `api` + `app` (declared in `src/common/SearchTypes.ts`)
- [ ] `ListItemsResults` exposed by `api` + `app` (declared in `src/common/SearchTypes.ts`)
- [ ] `ListRelationshipsConfig` exposed by `api` + `app` (declared in `src/common/SearchTypes.ts`)
- [ ] `LiteralValue` exposed by `api` + `app` (declared in `src/common/TypeParsing/TypeInfo.ts`)
- [ ] `TypeInfo` exposed by `api` + `app` + `common` (declared in `src/common/TypeParsing/TypeInfo.ts`)
- [ ] `TypeInfoDataItem` exposed by `api` + `app` (declared in `src/common/TypeParsing/TypeInfo.ts`)
- [ ] `TypeInfoField` exposed by `api` + `app` + `common` (declared in `src/common/TypeParsing/TypeInfo.ts`)
- [ ] `TypeInfoMap` exposed by `api` + `common` (declared in `src/common/TypeParsing/TypeInfo.ts`)
- [ ] `TypeInfoORMServiceError` exposed by `app` + `common` (declared in `src/common/TypeInfoORM/Types.ts`)
- [ ] `TypeInfoValidationResults` exposed by `api` + `common` (declared in
  `src/common/TypeParsing/Validation.ts`)
- [ ] `TypeOperation` exposed by `api` + `app` + `common` (declared in `src/common/TypeParsing/TypeInfo.ts`)

---

## Phase 2 — Fix plan proposal (still no code edits)

Based on the report, propose the minimal, consistent strategy:

- [x] Remove all disallowed cross‑barrel re-exports.
- [x] Ensure each symbol is imported from its owning barrel.
- [x] Update docs/examples to use owning barrel imports.
- [x] If any consumer-facing breakage is expected, list it explicitly (paths and symbols).

Deliverable: Add a short section to the report: “Proposed removals & expected breakages”.

---

## Phase 3 — Execute fixes (ONLY after approval)

### 3.1 Remove disallowed cross-barrel exports

- [x] Delete/modify export statements so barrels only export their own domain symbols.
- [x] Ensure `iac-packs/*` exception remains intact.

### 3.2 Repair internal imports

- [x] Update Voltra internal imports so they reference the correct owning modules (prefer direct module paths inside
  `src/` rather than importing through a different barrel).

### 3.3 Repair public API usage in docs/examples

- [x] Update README / docs / examples to import from the owning barrel.

### 3.4 Validate

- [x] Typecheck
- [x] Build all targets
- [x] Generate docs (if applicable) and ensure links/sections still correct
- [x] Run tests

---

## Definition of Done

- [ ] `docs/reports/cross-barrel-exports.md` exists and is complete.
- [x] No disallowed cross-barrel re-exports remain.
- [ ] `iac-packs/*` cross-barrel exports remain (and only those).
- [x] Build + typecheck pass.
- [x] Docs/examples updated and consistent.
