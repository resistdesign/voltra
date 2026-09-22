# Optional Auth Info Resolution

## Goal

Allow `handleCloudFunctionEvent` to resolve authentication information independently from cloud-event normalization so public routes can receive unauthenticated traffic while protected routes continue to enforce Voltra route auth.

## Checklist

- [x] Add a cloud-agnostic `getAuthInfo` resolver contract to the router API and wire it into `handleCloudFunctionEvent`.
- [x] Add AWS `getCognitoAuthInfo` helper for optional Cognito JWT authentication.
- [x] Preserve existing gateway-authorizer behavior and document when to use gateway authorization versus pass-through auth resolution.
- [x] Add/update tests covering authenticated, unauthenticated, invalid-token, public-route, and protected-route behavior.
- [x] Add reference example/docs for optional auth resolution; leave the demo site runtime/IaC unchanged.
- [ ] Verify build/tests/docs/export checks and open a PR.
