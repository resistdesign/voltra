# Efficient DynamoDB Health Maintenance Enumeration

## Goal

Make Voltra Health/index-maintenance traversal efficient on the unified DynamoDB index table while keeping physical DynamoDB schema knowledge inside Voltra.

The previous maintenance path used bounded table scans with a `kind` filter. On a unified index table, DynamoDB evaluates unrelated terms, ranges, postings, occupancy records, and relationship records before applying that filter. A bounded maintenance page can therefore consume reads while returning few or zero document mirrors.

Voltra alpha does not preserve that path. The canonical DynamoDB index database now includes the infrastructure required for direct maintenance enumeration.

## Canonical index infrastructure

Voltra owns one internal infrastructure contract for its DynamoDB index table:

- base partition key: `pk`
- base sort key: `sk`
- logical record-kind attribute: `kind`
- maintenance GSI: `VoltraIndexMaintenance`
  - partition key: `kind`
  - sort key: `pk`
  - projection: `KEYS_ONLY`

The contract is shared internally by the API driver and IaC pack. Applications do not configure the maintenance index name.

## Semantic IaC pack

The generic `addDatabase` pack now supports global secondary indexes because that is a useful DynamoDB primitive.

Voltra indexing should not require consumers to reproduce its exact table schema with that primitive, however. A new semantic pack owns the canonical schema:

```ts
cft.applyPack(addIndexDatabase, {
  tableId: "IndexingTable",
});
```

`addIndexDatabase` delegates to `addDatabase` and creates the complete Voltra index table, including the maintenance GSI.

Consumers that use the Voltra DynamoDB indexing drivers should provision their index table with `addIndexDatabase`.

## Runtime configuration

Runtime configuration remains intentionally minimal:

```ts
const table: IndexTableConfig = {
  tableName: process.env.INDEXING_TABLE as string,
};
```

There is no `maintenanceIndexName` runtime option and no additional environment variable. The DynamoDB indexing driver knows the canonical maintenance GSI name because Voltra owns both sides of the contract.

## Maintenance enumeration

Structured and full-text maintenance enumerate logical record families directly through the maintenance GSI:

- structured document mirrors: `kind = "sd"`
- full-text document mirrors: `kind = "fm"`

There is no scan fallback.

If the canonical infrastructure is not deployed, maintenance fails instead of silently degrading into a much more expensive traversal mode. This keeps alpha deployments on one state-of-the-art path and prevents infrastructure drift from being hidden.

## Strong-read repair safety

DynamoDB GSIs are eventually consistent.

For structured mirrors, Voltra therefore:

1. queries the KEYS_ONLY maintenance GSI;
2. batch-loads the corresponding base-table records with `ConsistentRead: true`;
3. preserves page order and tolerates records deleted between GSI enumeration and hydration;
4. continues through the existing strongly validated Health/canonical repair path.

Full-text maintenance only needs the projected base keys to decode document and field identity, so it can use the KEYS_ONLY GSI result directly. Destructive repairs still use the existing guarded validation/recheck semantics.

## Architecture boundary

The optimization remains entirely inside the DynamoDB indexing implementation.

Generic TypeInfo ORM maintenance and Health APIs do not contain DynamoDB concepts. Other storage drivers continue to implement the same generic maintenance contracts using their own native enumeration strategies.

## Demo

The Voltra demo is upgraded to the canonical path:

- it provisions the unified index table with `addIndexDatabase`;
- API runtime configuration still receives only the table name;
- no maintenance-GSI environment variable or hand-authored GSI schema exists in demo code.

## Adoption

This is an alpha contract change, not a compatibility layer.

When a DynamoDB deployment moves to this Voltra release, its index table infrastructure should be updated to the canonical `addIndexDatabase` shape. Existing unified index records already persist `kind`, so DynamoDB can populate the new GSI from the current table contents; Voltra does not need a second logical reindex solely to create the GSI.

## Verification

- Direct maintenance-GSI query coverage.
- Strong base-table hydration coverage for structured mirrors.
- Full-text KEYS_ONLY enumeration coverage.
- AWS SDK adapter coverage for `Query.IndexName`.
- Generic `addDatabase` GSI coverage.
- Dedicated `addIndexDatabase` schema/contract coverage.
- Demo IaC uses `addIndexDatabase`.
- Demo runtime environment mapping remains table-only.
- Consumer smoke coverage includes `addIndexDatabase` and table-only `IndexTableConfig`.
- Full tests, declaration build, demo builds, export checks, and consumer smoke checks run in CI.
