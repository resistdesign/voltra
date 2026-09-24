# Efficient DynamoDB Health Maintenance Enumeration

## Goal

Make Voltra Health/index-maintenance traversal efficient on unified DynamoDB index tables without contaminating storage-neutral ORM/Health APIs with DynamoDB-specific behavior.

The existing DynamoDB maintenance path performs bounded table scans with a `kind` filter. This is safe and resumable, but a unified index table contains many unrelated record families, so a page can evaluate many physical records and return few or zero structured/full-text document mirrors. Large Health sweeps therefore require many mostly-empty passes.

## Design

### Optional maintenance GSI

DynamoDB index-table configuration now accepts an optional `maintenanceIndexName`.

The corresponding GSI is:

- partition key: `kind`
- sort key: `pk`
- projection: `KEYS_ONLY`

All existing unified index records already persist `kind`, so adding the GSI to an existing table allows DynamoDB to backfill it without rewriting index data.

The GSI intentionally remains optional:

- deployments that configure it use direct `Query` enumeration by logical record family;
- existing deployments continue using the current strongly-consistent bounded `Scan` fallback.

### Strong-read preservation

DynamoDB GSIs are eventually consistent. Structured document maintenance needs full mirror state and existing maintenance behavior benefits from strong base-table reads.

For structured mirrors, Voltra therefore:

1. queries the KEYS_ONLY maintenance GSI for only `structuredDocument` keys;
2. batch-gets those base-table records with `ConsistentRead: true`;
3. preserves the GSI page order while tolerating records removed between the GSI query and base-table hydration.

Full-text maintenance only needs the persisted base keys to decode document/field identity, so it can use the KEYS_ONLY query result directly. Destructive Health repair remains guarded by the existing strongly-consistent canonical verification/recheck path.

### Architecture boundary

The optimization is entirely inside the DynamoDB indexing driver. Generic TypeInfo ORM maintenance APIs and Health monitor semantics are unchanged.

Other drivers retain their existing enumeration implementations.

## IaC and demo support

- Extend `addDatabase` with optional global-secondary-index configuration.
- Configure the Voltra demo unified index table with a `kind` + `pk` KEYS_ONLY maintenance GSI.
- Pass the GSI name into the demo's `IndexTableConfig` through a dedicated environment variable.
- Keep the one-index-table example explicit about the optional optimized path and backward-compatible scan fallback.

## Compatibility

- `maintenanceIndexName` is optional.
- No persisted key format changes.
- No reindex/migration is required when enabling the GSI because DynamoDB backfills existing records using their current `kind` attribute.
- Deployments may roll out the GSI first, then configure `maintenanceIndexName`.
- Scan-capable existing deployments continue to work unchanged.

## Verification

- Focused coverage for direct GSI query enumeration and strong base-table hydration.
- Focused coverage for the legacy scan fallback.
- AWS SDK adapter coverage for `IndexName`.
- Database IaC pack coverage for GSI CloudFormation output.
- Demo environment-mapping coverage.
- Index-table configuration validation coverage.
- Consumer smoke coverage for the new optional config.
- Full CI/build/export/demo checks.
