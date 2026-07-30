# ORM Indexed Query Integration

`TypeInfoORMService.list` has three routes:

1. No criteria: canonical driver listing.
2. Fully indexable criteria: `criteriaToIndexExpression` → `searchIndex`.
3. Genuinely unsupported criteria: canonical scan-and-compare, only when
   `allowFullScanFallback` is enabled.

There is no text-versus-value routing decision.

## Reads

The compiler checks each criterion against `fieldsByType`. Mixed text, exact,
membership, and range leaves retain their `AND`/`OR` structure. The query
engine returns candidate identifiers and a verification flag.

The ORM loads candidates in engine order, verifies approximate plans against
the original criteria, applies DAC, cleans/projections fields, and refills the
page after every excluded or stale candidate.

## Writes

Create, update, delete, manual reindex, and rebuild operations use one
capability-driven mutation plan:

- value fields are written once through `valueWriter`;
- text-capable fields update postings, positions, statistics, membership, and
  mirrors through `text`;
- all physical writes share the configured mutation coordinator.

Text updates normally diff against the stored field mirror. When an older or
newly indexed field has no mirror, the DynamoDB writer performs one strongly
consistent batch read of the relevant membership and position records, repairs
the actual persisted state, and writes the mirror. Later updates use the normal
single-mirror-read path again.

Manual maintenance accepts `indexFields`, `previousIndexFields`, and
`nextIndexFields`. A previous field override may name a field removed from the
current TypeInfo so stale text records can still be cleaned during migration.

## Observability

`onListRoutingDecision` receives the logical route and, for indexed queries,
the unified plan diagnostics. `onIndexWrite` receives one event per logical
document mutation with the field count. Hooks never alter ORM behavior.
