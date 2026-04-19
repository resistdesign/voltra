# Feature: API ORM Drivers - Export DB Specific Config Types

## Summary:

I tried to import `DynamoDBSpecificConfig` from voltra, in another project but I could not.
It is not exported properly, for this, and it should be.

All of the DB config specific types should be. That is their entire purpose.

Make sure all types like this are properly exports.

Do not delete the summary. Track your progress below.

## Checklist

- [x] Audit the ORM driver-specific config type definitions and current export surface.
- [x] Export all ORM driver-specific config types through the API ORM driver barrel.
- [x] Add verification coverage for importing the driver-specific config types from `@resistdesign/voltra/api`.
- [x] Run focused verification for the updated export surface.
