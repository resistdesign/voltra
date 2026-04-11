# Feature: API ORM DynamoDB Sort Field GSI

## Plan Summary:

Right now, the TypeInfo ORM Service does nothing with sort fields when using the DynamoDB driver.

What we want to do is have the DynamoDB driver grab the first SortField item in the array and assume that the field name
is also the name of a GSI IndexName that it should use for a Query. The driver will also honor the `boolean` `reverse`
setting value on the SortField item.

Any additional SortFields will be ignored.

The documentation for the DynamoDB driver will need to make this functionality very clear.

Before doing any work, report any serious challenges about this feature.

Keep this summary and track progress below.

## Progress

- [x] Phase 1: Validate requested DynamoDB GSI sort behavior and identify the first safe implementation slice.
  - [x] Inspect the current DynamoDB list implementation and confirm whether the requested `sortFields[0] -> GSI Query`
    contract is technically valid.
  - [x] If technically valid, route DynamoDB list calls through the first sort field's GSI and honor `reverse`.
  - [x] Add/update driver spec coverage for GSI routing and reverse ordering.
  - [x] Update DynamoDB ORM documentation to explain the sort-field-to-GSI behavior and its requirements.

## Findings

- [x] The Solution Example clarifies the contract: when `sortFields[0]` is present, the DynamoDB driver should treat its
  `field` as the GSI `IndexName`, reuse the normal list `criteria` as the `KeyConditionExpression` input, and let
  DynamoDB reject invalid criteria/index combinations at runtime.
- [x] Additional sort fields are intentionally ignored by the DynamoDB driver.

## Solution Example:

This is proper QueryCommnd. It works. And it only knows the IndexName of the GSI. In this example, things like
`KeyConditionExpression` are hard coded, but in the Voltra TypeInfo ORM, we expect the right query fields to come in
through the search criteria as normal. All required information is already supplied through the typical `list` call
interface/api-surface. If an implementation call doesn't include the proper required fields in the search criteria, then
the query will fail. And that's ok.

```typescript
new QueryCommand({
  TableName: DATABASE_USER_INFO_TABLE_NAME,
  IndexName: QUERY_INDEX_NAMES.USER_INFO.BY_STATUS_SORT_ON_STATUS_TIMESTAMP,
  KeyConditionExpression: '#status = :status',
  ExpressionAttributeNames: {
    '#status': 'status',
  },
  ExpressionAttributeValues: {
    ':status': {
      S: status,
    },
  },
  ScanIndexForward: false,
  ExclusiveStartKey: cursor ? JSON.parse(cursor) : undefined,
})
```
