# Optional Cloud Function Authentication

## Goal

Allow `handleCloudFunctionEvent` to resolve authentication independently from event normalization so public routes can still receive unauthenticated requests while protected routes continue to enforce Voltra route auth. Provide an AWS Cognito helper for validating bearer tokens without requiring an API Gateway authorizer.

## Checklist

- [x] Add a cloud-agnostic async-capable `getAuthInfo` hook to `handleCloudFunctionEvent` without breaking existing callers.
- [x] Add `AWS.getCognitoAuthInfo` with AWS-maintained `aws-jwt-verify` validation, internal verifier/JWKS caching, and normalized `AuthInfo` output.
- [x] Preserve existing API Gateway authorizer claim extraction behavior when no custom auth resolver is supplied.
- [x] Add tests for public pass-through, protected-route denial, valid resolved auth, and Cognito JWT validation.
- [x] Document the pass-through semantics on the router API and the `addGateway.authorizer` option.
- [x] Add README/reference example coverage without changing the demo site IaC/API implementation.
- [ ] Verify build/tests/exports and review the final PR diff.
