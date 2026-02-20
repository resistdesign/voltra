# IaC Auth Configure Flow

## Goal

When choosing not to use a UserPool Domain and Callback/Logout URLs, configure Cognito auth flow defaults so stack
updates succeed and no invalid OAuth settings are emitted.

Automatic defaults are preferred.

## Checklist

- [x] Identify where user-pool-client OAuth flow properties are set for auth packs.
- [x] Update pack generation so `enableUserPoolDomain: false` emits a valid non-hosted-UI client configuration.
- [x] Update/add pack spec coverage to assert no-domain OAuth client defaults.
- [x] Run targeted tests for updated specs.
- [x] Verify diffs and summarize behavior changes.

## Next Phase: Federated Provider Configurability

- [x] Extend auth/user-management pack config to optionally accept `supportedIdentityProviders`.
- [x] Keep sensible defaults so existing consumers get current behavior (`["COGNITO"]` in domain-enabled mode).
- [x] Validate/guard config so provider settings are only applied in domain-enabled OAuth mode.
- [x] Add/expand test-utils + spec assertions for:
- [x] domain-enabled default behavior with no new config supplied.
- [x] domain-enabled custom provider list behavior.
- [x] domain-disabled behavior still omits provider/OAuth hosted-UI settings.
- [x] Update pack-level docs/comments for new config and usage constraints.
- [x] Run targeted auth pack specs and confirm no regressions.

## Notes

Doc comments for auth/user-management config properties were expanded to include default behavior, domain-enabled/domain-disabled constraints, and provider naming guidance.

Sample error from a stack update trying to remove callback/logout URLs while flow still expected them:

```
Resource handler returned message: "CallbackUrls can not be empty when code flow or implicit flow is selected (Service: CognitoIdentityProvider, Status Code: 400, Request ID: 15e8d8f2-cdc1-4d7f-b558-141d94d6a585) (SDK Attempt Count: 1)" (RequestToken: 8ce51d45-2ff8-2294-c359-4883261ea5e5, HandlerErrorCode: InvalidRequest)
```
