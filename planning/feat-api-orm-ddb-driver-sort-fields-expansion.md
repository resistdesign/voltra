# Feature: API ORM DDB Driver - Sort Fields Expansion

## Summary:

Currently, the DynamoDB ORM driver will use only the first sort field. Using it as a name for an index.
This is great, but I think we can do a little better.

Instead of just assuming we want an index when it sees sort fields, I want to make it configurable.

So it should:

1. Use the first sort field as an index name if and only if a flag has been set to true in its configuration.
2. Otherwise, it should just do in-memory sorting.

Keep this summary and track progress below.
