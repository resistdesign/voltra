# Fix API Service Request Non-JSON Responses

In `src/app/utils/Service.ts` `sendServiceRequest`, the data is always assumed to be JSON.
But when something outside of the Voltra API routes returns a response (Like "Unauthorized" from an AWS API Gateway),
the data is not always JSON.

In these cases, we need to detect that the response is not JSON and add it to an object and:

1. On success, return the object with the response set to a `data` property.
2. On error, throw the object with the error set to a `message` property.

Examples:

```
// Success
{
  data: "Some Response",
}

// Error
{
  message: "Unauthorized",
}
```

## Checklist

- [x] Update `src/app/utils/Service.test-utils.ts` to mock text-based response parsing behavior.
- [x] Add explicit non-JSON success and error test scenarios.
- [x] Update `src/app/utils/Service.spec.json` expectations for non-JSON response handling.
- [x] Run targeted verification for `src/app/utils/Service.spec.json`.
- [x] Update dependent fetch mocks in `src/app/utils/TypeInfoORMClient.test-utils.ts` and `src/app/utils/ApplicationStateLoader.test-utils.ts` to provide `response.text()`.
- [x] Run full `yarn test` and verify the suite passes.
