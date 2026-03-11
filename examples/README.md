# Examples Index

These files are curated **reference snippets** for consumers.

- They are organized by domain so you can quickly find relevant usage.
- They are not integration demos and are not required to compile end-to-end.
- Use them as copy/adapt starting points in your own codebase.

## Routing (Client/App)

- `examples/routing/app-routing.ts`

Use this for client route usage via platform barrels:
- `@resistdesign/voltra/web` for web Route roots/matchers
- `@resistdesign/voltra/native` for native Route roots/matchers
- `@resistdesign/voltra/app` only for adapter escape hatches (`createUniversalAdapter`)

## API Routing (Backend)

- `examples/api/backend-routing.ts`
- `examples/api/orm-structured-indexing.ts`
- `examples/api/orm-index-maintenance.ts`

Use this for Cloud Function/API event routing with `@resistdesign/voltra/api`. This is separate from app/client routing.
Use `orm-structured-indexing.ts` as the starting point for explicit structured field-inclusion config.
Use `orm-index-maintenance.ts` as the starting point for reindexing or cleanup after out-of-band writes and schema-driven index changes.

## ORM Search + Indexing Reference

- Multi-field fulltext indexing example: `site/api/routeMap.ts`
- Criteria-driven search UI flow: `site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx`
- Runtime behavior contract: `src/api/ORM/INDEXING_INTEGRATION.md`
- Manual maintenance example: `examples/api/orm-index-maintenance.ts`

Use these references for the current pattern: configure fulltext fields per type, then query with `criteria` so `list`
auto-selects fulltext/structured/fallback behavior. For maintenance flows, use the service-side index helpers with prior
snapshots or prior fulltext field lists when removing old tokens.

## Forms

- `examples/forms/web-form-suite.ts`
- `examples/forms/native-form-suite.ts`
- `examples/forms/auto-form-validation-customization.tsx`

Use these for web/native form renderer entrypoints.

## Layout

- `examples/layout/web-easy-layout.ts`
- `examples/layout/native-easy-layout.ts`

Use these for EasyLayout template usage in web/native runtimes.

## Common Types

- `examples/common/types.ts`
- `examples/common/typeinfo-validation.ts`

Use this for shared `@resistdesign/voltra/common` type references.

## Build-Time Parsing

- `examples/build/type-parsing.ts`

Use this in build tooling only (`@resistdesign/voltra/build`), not runtime app/server code.
