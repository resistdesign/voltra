# Feature: API ORM DDB Driver - Sort Fields Expansion

## Summary:

Currently, the DynamoDB ORM driver will use only the first sort field. Using it as a name for an index.
This is great, but I think we can do a little better.

Instead of just assuming we want an index when it sees sort fields, I want to make it configurable.

So it should:

1. Use the first sort field as an index name if and only if a flag has been set to true in its configuration.
2. Otherwise, it should just do in-memory sorting.

Keep this summary and track progress below.

## Checklist

- [x] Add a DynamoDB-specific config flag that controls whether the first sort field is used as an index name.
- [x] Update the driver list path so sort fields default to in-memory sorting unless the flag is enabled.
- [x] Expand DynamoDB driver tests to cover both the default fallback and the opt-in query behavior.
- [x] Update the ORM indexing integration contract to describe the new sort/index behavior.
