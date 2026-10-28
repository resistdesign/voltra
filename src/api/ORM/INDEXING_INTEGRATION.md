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

## Conditional canonical writes and required strong reads

```ts
await orm.create("Request", payload, { ifAbsent: true });
await orm.update("Request", { id, state: "accepted", version: 1 }, {
  preconditions: { exists: true, expected: { state: "pending", version: 0 } },
}, context);
const canonical = await orm.read("Request", id, undefined, context, {
  consistency: "strong",
});
```

Creation uses the driver's existing identity generator. Use a deterministic
identity when retries must contend for the same record. `ifAbsent` refuses an
occupied identity without replacing it. Update preconditions always require
existence, even when only `expected` is supplied or the guard is empty. All
expected scalar fields must equal their stored values before any patch/operator
is applied. `null` matches a stored null, not an absent field. Guards are checked
against TypeInfo; unknown, relationship, array and non-scalar values are refused.
Version fields are ordinary expected numeric fields, not an ORM-managed counter.

`TypeInfoORMServiceError.CONDITIONAL_WRITE_CONFLICT` identifies a rejected atomic
mutation. Validation, DAC and infrastructure failures remain distinct.
`UNSUPPORTED_CAPABILITY` means a driver cannot deliver a requested guarantee.
Configs go directly to existing CRUD methods; there is no capability registry or
ORM prediction of driver support. A v3 driver must honor a requirement or refuse
it before side effects. Guards are never emulated with an unconditional write.

Strong reads pass through normal validation, full-item DAC and projection.
Server read options follow context; client options follow selected fields.
Routes supply server-owned context. Disabling field operators preserves guards.
Ordinary reads retain their driver's default consistency.

## Canonical mutation hooks and maintenance

`DataItemOperationConfig` is server-only, composed with existing CRUD configs.
It is not a route/client option. `coordination.inspect(current)` authorizes a
strong canonical snapshot; `changed(before, after)` runs generic indexing after
commit. Drivers bind inspected `guardFields` (schema values, including absence)
to the atomic mutation boundary. No global lock across callbacks is required.

- DynamoDB create/overwrite returns `ALL_OLD` alongside the submitted new image.
  Indexed/DAC update reads strong prior state, compares observed fields and schema
  absence atomically, and uses `ALL_NEW`. Delete compares inspected state and uses
  `ALL_OLD`. A concurrent change produces `CONDITIONAL_WRITE_CONFLICT`; retry only
  after re-reading and re-authorizing. No ordinary/post-write reads reconstruct
  these mutation images. Unindexed, non-DAC writes need no snapshot reads.
- DAC checks stored/proposed UPDATE permissions, field deletion permissions and
  READ access to expected values and stored observations. A denied guard is never
  silently removed. Item-backed ownership resolvers receive the inspected
  `canonicalItem` as the third `getOwnerPrefix` argument; use this snapshot when
  supplied. Its schema fields are bound at commit. External role/policy/owner
  mappings require application coordination; arbitrary external lookups are not
  covered by canonical snapshot checks.
- Failed conditions/authorization never invoke `changed`, so losing payloads
  never index. Every issued index write drains before callback failure escapes,
  including nested full-text token batches and synchronous writer failures.
- Memory data, relationships and files retain their internal queues. Cloud
  writers can overtake each other's index follow-up; canonical data remains
  authoritative. Cross-process ordering, external writes and crashes can leave
  stale postings. Existing health inspection, reindex and known-previous-state
  repair reconcile them; there is no cross-store transaction or rollback.
- Reindex and schema reconciliation request strong current state. List pages
  discover IDs, rather than supplying mutation authority. Reindex is available
  on every shipped driver. Supply known previous images/field overrides for
  out-of-band changes. A concurrent canonical change may require another pass.
- Orphan cleanup reindexes a present canonical item. Only absent-state
  destructive cleanup requests `exclusive: true`, meaning protection against
  recreation through inspection/cleanup. Memory supplies it. DynamoDB/S3 refuse
  that specific missing-identity action as `maintenanceUnsupported`, leaving
  postings intact. Strong absence alone cannot authorize deletion, and index
  version checks alone do not protect a canonical recreation.

| Driver | Canonical guarantees and index follow-up |
| --- | --- |
| In-memory data/relationships | Atomic ifAbsent/guards and current images; internal queue through follow-up |
| In-memory files | Current metadata images and rename queue; business conditional writes explicitly refused |
| DynamoDB data | Atomic Put/Update business guards, strong reads, snapshot-bound DAC, returned mutation images, generic indexing and reindex |
| S3 files | Strong HEAD metadata snapshots for generic indexing/reindex; location-only DAC supported. Atomic business guards and mutable-metadata DAC refused specifically |

S3 exposes object metadata rather than application records. Its HEAD snapshots
can race external object changes; they are not exact transactional before/after
images. Rename is copy then delete; a failed source delete reports canonical
commitment because the destination already exists. Metadata-derived owner/DAC
checks cannot be bound atomically by this file driver's API, so mutations whose
DAC schema includes mutable metadata are refused before writes. Location fields
`id`, `name`, `directory` are immutable for the addressed key and can be authorized.
Read DAC, health inspection and ordinary indexed file workflows remain available.
An omitted rename directory preserves the source directory; a same-location
update must never copy an object onto itself and then delete it.

Manual index helpers remain trusted administrative operations. Reindex and
normal indexing are not excluded merely because a driver cannot hold external
writers through asynchronous work. No indexing algorithm lives in a canonical
driver; wrappers forward configs and preserve errors. Create retains its existing
validation/permission semantics; this contract does not add create DAC.

## Canonical success followed by index failure

Canonical and index stores are independent. Memory queues order local writers;
cloud callbacks do not supply a transaction, rollback, crash recovery, or atomic
visibility across stores. Readers can observe a canonical commit before its index work finishes.
A crash or index failure can leave partial index state.

A failed postcommit callback throws `CanonicalWriteCommittedError` with
`message: CANONICAL_WRITE_COMMITTED`, `canonicalCommitted: true` and the original
`cause`. It does not expose canonical before/after images to application callers.
DynamoDB does not need a read after commit. S3 follow-up HEAD failures also report
canonical commitment instead of presenting the successful write as uncommitted.
Infrastructure errors during the canonical request can still leave an unknown
outcome; reconcile rather than assume that nothing was written.

Use an authorized canonical read to establish current state before retrying;
search results do not establish existence or ownership. Trusted repair can use
`reindexStoredItem` with known previous state and schema overrides.
Repair itself can fail partially in independent stores and must be retried or
investigated. A create retry may conflict after an earlier committed attempt.
No cloud/distributed concurrency guarantee is established by intercepted SDK
command tests; they verify emitted guards/images, resulting generic index behavior
and specific refusals without establishing live AWS concurrency behavior.
