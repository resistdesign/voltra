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

## Coordinated canonical mutations and maintenance

`DataItemOperationConfig` is a server-only driver contract, composed with configs
on existing create/read/update/delete methods. It is not a route/client option.
Its `coordination.inspect(current)` and `coordination.changed(before, after)`
callbacks contain generic authorization and indexing work. The driver provides
**exclusion of all competing canonical mutations** of that identity from
inspection through callback completion, including unconfigured/direct driver
writes. It must refuse before side effects if it cannot provide that exclusion.
Images are full detached canonical values; `undefined` means absence. Callbacks
must not recursively perform coordinated operations on the same store.

- Create/overwrite uses exact prior and committed images, removing old postings.
- Ordinary and guarded update use exact mutation images, with no before/after
  reads. No-index, non-DAC mutations need no coordination or snapshot reader.
- DAC updates evaluate both stored and proposed permissions under exclusion,
  including field deletion permissions. Expected-field guards additionally
  authorize READ of probed and current values before evaluating the condition.
  Delete authorizes the exact item being deleted under the same exclusion.
  A concurrent replacement cannot invalidate those item-dependent checks.
- Losing conditions and denied authorization never call `changed` and therefore
  perform no index writes. A guarded false result is normalized to conflict.
- Successful indexed mutations hold exclusion through generic index work, so a
  later canonical writer cannot overtake an earlier writer's index mutations.
  All issued index writes settle before exclusion is released, including when
  one fails. Identity changes remove the previous identity's postings first.
- Orphan cleanup inspects absence under the same exclusion and holds it through
  structured and text cleanup. Index version checks additionally reject index
  drift since audit. Recreation waits until cleanup finishes or fails.
- Reindex, type rebuild and schema reconciliation use coordinated current state,
  never ordinary list/read snapshots as mutation authority. Lists discover IDs.
  Supply known `previousItem`/field overrides for out-of-band changes. Raw manual
  index helpers are trusted administrative operations; callers own exclusion.

`verifyStoredItemForIndexMaintenance` requests a strong read for diagnostics;
its result does not authorize destructive cleanup. No strong-read recheck or
post-cleanup restoration is treated as proof against concurrent recreation.

Driver enforcement:

| Driver | Optional reads/conditions | Required coordination |
| --- | --- | --- |
| In-memory data and relationships | Strong instance reads; atomic ifAbsent and update conditions | Store-wide queue covers direct mutations, DAC and all index callbacks |
| In-memory files | Strong metadata reads; conditional writes refused | Store-wide queue covers alias/rename changes and exact metadata images |
| DynamoDB data | Consistent GetItem; atomic conditional PutItem/UpdateItem | Refused before SDK requests: the current driver cannot exclude external writers through asynchronous index/DAC work |
| S3 files | Strong HEAD metadata; conditional writes refused | Refused before I/O: HEAD plus later operations is not mutation exclusion |

Thus indexed CRUD and DAC-sensitive mutations on DynamoDB/S3 currently fail
explicitly; they do not silently run an unsafe approximation. Non-indexed,
non-DAC CRUD and supported business read/condition options remain available.
Cleanup returns `maintenanceUnsupported` without index changes when exclusion
is unavailable; reindex throws `UNSUPPORTED_CAPABILITY`. Future implementations
must satisfy this same generic contract rather than add service vendor branches.
No indexing strategy lives in the canonical driver. Derived in-memory relationship
drivers inherit the contract; wrappers forward configs and preserve errors.
In-memory file renames refuse an occupied destination with a conflict. Creating
at an existing rename alias is refused as unsupported before changing state;
it cannot be represented truthfully as a single-identity overwrite.

Create retains existing validation/permission semantics; this contract does not
add create DAC. Role/policy resolution is request authorization policy: mutations
of policy or owner mappings outside the canonical store must themselves be
coordinated by the application. Item-backed owner changes through this driver
are covered. Direct external index writes and out-of-band canonical writes do
not participate in an in-memory instance's exclusion domain.

## Canonical success followed by index failure

Canonical and index stores are independent. Exclusion orders participating writers;
it does **not** supply a transaction, rollback, crash recovery, or atomic visibility
across stores. Readers can observe a canonical commit before its index work finishes.
A crash or index failure can leave partial index state.

A failed postcommit callback throws `CanonicalWriteCommittedError` with
`message: CANONICAL_WRITE_COMMITTED`, `canonicalCommitted: true` and the original
`cause`. It does not expose canonical before/after images to application callers.
No optional read-after-write can reject an otherwise committed canonical operation.
Infrastructure errors during the canonical request can still leave an unknown
outcome; reconcile rather than assume that nothing was written.

Use an authorized canonical read to establish current state before retrying;
search results do not establish existence or ownership. Trusted repair can use
coordinated `reindexStoredItem` with known previous state and schema overrides.
Repair itself can fail partially in independent stores and must be retried or
investigated. A create retry may conflict after an earlier committed attempt.
No cloud/distributed concurrency guarantee is established by intercepted SDK
command tests; they prove request construction and pre-I/O refusal only.
