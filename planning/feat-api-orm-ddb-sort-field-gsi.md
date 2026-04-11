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
