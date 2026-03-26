# Fix API Indexing False Missing Indexed Field Error

# Problem:

API Indexing is throwing the error `INDEXING_MISSING_INDEX_FIELD` for an indexed field when that field is not supplied
on and item during creation. (And possibly other operations. Needs further inspections.)

The problem occurs when that field is optional. There is no reason for that error.

In fact, there is no reason for that error, **ever** because validation will take care of throwing when required fields
are missing.

# Solutions:

1. Remove that error entirely. There's no need for it.
2. We can simply assume that that field is just empty and then index based on an empty value. No need to complain,
   validation will handle this particular scenario.

# Additional Requirements:

Find out if indexing is going to cause any other unexpected behavior like this and document it in this plan.

# Phase Checklist

- [x] Review compiled learnings before proceeding.
- [x] Remove `INDEXING_MISSING_INDEX_FIELD` handling from full-text indexing flows.
- [x] Add regression coverage for omitted optional indexed fields during create/remove/replace flows.
- [x] Inspect adjacent indexing behavior for similar unexpected missing-field behavior and document findings here.
- [x] Verify with focused tests.

# Inspection Notes

- Full-text indexing already normalizes `null`/`undefined` indexed values to `""` in `src/api/Indexing/API.ts`, which means the ORM-level missing-field throw is redundant and contradictory to backend behavior.
- The redundant throw exists in all three full-text ORM helper flows: index, remove, and replace.
- Structured indexing already skips `undefined` values without throwing, so this false error path appears limited to the full-text ORM pre-check.
- Adjacent inspection did not find another similar false missing-field error path. The remaining required-field constraint is the primary field/doc id, which still must exist because index writes/removals cannot address a document without it.
- Focused verification passed with `yarn tsx src/common/Testing/CLI.ts ./src/common/TypeInfoORM/Types.spec.json ./src/api/ORM/TypeInfoORMService.indexMaintenance.spec.json`.

# Finally:

1. Do not overwrite anything in this plan. You may add to it, but keep the basis of the content intact.
2. Review learnings before proceeding.
