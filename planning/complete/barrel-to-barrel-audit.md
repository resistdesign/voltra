# Barrel-to-Barrel Re-export Audit

Generated: 2026-02-16
Rule checked: `src/**/index.ts` exporting from another `src/**/index.ts`.

Total occurrences: 20

## Occurrences

- `src/api/index.ts:58` `export * from "./Indexing"` -> `src/api/Indexing/index.ts`
- `src/api/index.ts:63` `export * from "./ORM"` -> `src/api/ORM/index.ts`
- `src/api/index.ts:68` `export * from "./Router"` -> `src/api/Router/index.ts`
- `src/api/Indexing/index.ts:54` `export * from "./structured/index"` -> `src/api/Indexing/structured/index.ts`
- `src/api/ORM/drivers/index.ts:7` `export * from "./common"` -> `src/api/ORM/drivers/common/index.ts`
- `src/api/ORM/index.ts:4` `export * from "./drivers"` -> `src/api/ORM/drivers/index.ts`
- `src/app/forms/index.ts:8` named re-export from `"./core"` -> `src/app/forms/core/index.ts`
- `src/app/forms/index.ts:18` named re-export from `"./core"` -> `src/app/forms/core/index.ts`
- `src/app/index.ts:98` `export * from "./utils"` -> `src/app/utils/index.ts`
- `src/app/index.ts:103` `export * from "./forms"` -> `src/app/forms/index.ts`
- `src/app/utils/index.ts:17` `export * from "./easy-layout"` -> `src/app/utils/easy-layout/index.ts`
- `src/common/index.ts:31` `export * from "./CommandLine"` -> `src/common/CommandLine/index.ts`
- `src/iac-packs/index.ts:6` `export * from "../iac/packs"` -> `src/iac/packs/index.ts`
- `src/iac/index.ts:40` `export * from "./utils"` -> `src/iac/utils/index.ts`
- `src/native/forms/index.ts:9` `export * from "./primitives"` -> `src/native/forms/primitives/index.ts`
- `src/native/index.ts:10` `export * from "./forms"` -> `src/native/forms/index.ts`
- `src/native/index.ts:15` `export * from "./utils"` -> `src/native/utils/index.ts`
- `src/web/forms/index.ts:9` `export * from "./primitives"` -> `src/web/forms/primitives/index.ts`
- `src/web/index.ts:10` `export * from "./forms"` -> `src/web/forms/index.ts`
- `src/web/index.ts:15` `export * from "./utils"` -> `src/web/utils/index.ts`

## Why These Exist In Current Structure

- Entrypoint aggregation: `src/api/index.ts`, `src/app/index.ts`, `src/web/index.ts`, `src/native/index.ts`, `src/iac/index.ts`, `src/iac-packs/index.ts` act as top-level package surfaces and currently aggregate sub-entrypoint barrels.
- Domain layering aggregation: `src/api/ORM/index.ts`, `src/api/ORM/drivers/index.ts`, `src/api/Indexing/index.ts`, `src/app/utils/index.ts`, `src/common/index.ts` aggregate nested domain barrels to offer fewer import paths.
- Forms composition aggregation: `src/app/forms/index.ts`, `src/web/forms/index.ts`, `src/native/forms/index.ts` aggregate lower-level `core` or `primitives` barrels into form-facing barrels.

