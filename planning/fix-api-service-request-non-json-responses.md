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
