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
mutation; validation, DAC and infrastructure failures remain distinct.
`UNSUPPORTED_CAPABILITY` means the requested guarantee is unavailable. Drivers
advertise conditional create/update with `capabilities.conditionalCreate` and
`capabilities.conditionalUpdate`; typed configs pass through the existing
`createItem` and `updateItem` methods. Drivers must enforce the requested guarantee
atomically or refuse it. The ORM never emulates guards with an unconditional write.
Guarded updates require `readItemStronglyConsistent` when indexing is configured:
both the prior snapshot used to remove postings and the post-write snapshot used
to add postings must be current. Expected-field guards with DAC enabled also
require a strong prior snapshot to authorize observation of current stored values.
Without indexing or these snapshot-dependent security checks, atomic guarded
updates invoke neither ordinary nor optional strong readers and return the
successful atomic driver result directly. Guard authorization alone requires
only the pre-write snapshot. A
guarded `false` result becomes `CONDITIONAL_WRITE_CONFLICT` before any post-write
read or index work. Required strong reads use `readItemStronglyConsistent`
through the normal read validation, DAC and projection path and refuse unsupported
drivers. Existing context positions remain unchanged; read options follow context
on the server and follow selected fields on the client. Routes supply their own
DAC context. Disabling route field operators preserves supplied guards.

- DynamoDB data items use atomic conditional PutItem/UpdateItem and a strongly
  consistent canonical GetItem. Conditions apply to one canonical item, not to
  its separate index records. Command-shape specs intercept the SDK; they make
  no AWS calls and do not establish distributed concurrency behavior themselves.
- In-memory data items (including the derived relationship driver) check and
  mutate synchronously within a single driver instance, without yielding between
  them. Strong reads observe that instance's current state; they provide no
  cross-process persistence guarantee.
- S3 and in-memory file drivers do not advertise conditional mutation support;
  the ORM refuses such requests before file operations. File upload URLs and
  multi-step renames are not canonical data-item CAS. Their existing strong
  reader remains available for current metadata reads (S3 HeadObject or local
  state); this does not make subsequent URL usage or rename steps transactional.
- Legacy/custom drivers retain ordinary CRUD behavior. They must implement the
  capability declarations and enforce the configs with the documented guarantees
  to accept these requirements.

Omitting options preserves existing overwrite/upsert and ordinary-read defaults.
Create retains its existing validation/permission semantics; this change does not
introduce create DAC enforcement. Update/read retain their existing DAC checks.

## Canonical success followed by index failure

Canonical writes still precede indexing. A losing conditional mutation exits
before index writes, so it cannot index its proposed payload. A successful
canonical mutation and all of its indexes are **not** one transaction: an error
from create/update can mean canonical success followed by partial index failure.
A guard also does not serialize concurrent index maintenance or make a stale
pre-update snapshot authoritative for another concurrent writer.

After an ambiguous failure, use an authorized required-strong `read` of the
canonical identity and compare the intended state/version before deciding to
retry. Do not use search results to establish canonical existence or ownership.
A create retry may now conflict because the original canonical write succeeded;
that conflict alone does not identify which payload won. An infrastructure error
can also leave the canonical outcome unknown, so reconcile rather than assume
that nothing was written.

Trusted maintenance can use `verifyStoredItemForIndexMaintenance` to inspect
existence/consistency, then `reindexStoredItem` to refresh indexes from persisted
state. Supply the known `previousItem` when indexed values changed, and the
existing previous/next index-field overrides when schema changed, so stale
entries can be removed. Reindex prefers the supported strong reader; its fallback
on other drivers is best effort. Maintenance APIs are trusted administrative
surfaces, not substitutes for application DAC. Coordinate repair with other
writers using the existing maintenance workflow; no new recovery engine or
cross-record transaction is implied.
