# DynamoDB ORM Update Serialization

## Goals

- Identify why ORM-backed DynamoDB updates fail with `SerializationException`.
- Fix the DynamoDB driver update serialization path without widening scope.
- Add targeted coverage for non-scalar update values.

## Checklist

- [x] Reproduce the serialization issue in the DynamoDB update path and isolate the failing value-shape handling.
- [x] Patch `DynamoDBDataItemDBDriver.updateItem` to serialize expression attribute values correctly for lists/objects.
- [x] Add or update targeted driver coverage for list-valued updates and verify the affected spec.
