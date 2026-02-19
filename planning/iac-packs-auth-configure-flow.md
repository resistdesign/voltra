# IaC Auth Configure Flow

When choosing not to use a UserPool Domain and Callback/Logout URLs, we need the auth flow to be configured properly.

Whether this means a manual configuration property or automatically setting auth flow related Resource parameters to
something sensible when UserPool Domain is not enabled.

Automatic defaults are preferred.

We must be thorough and make sure all properties related to not having a user pool domain and calllowback/logout URLs
are set properly.

Here is a sample error from a stack update trying to remove the callback/logout URLs while the flow was still set to a
value that expects them:

```
Resource handler returned message: "CallbackUrls can not be empty when code flow or implicit flow is selected (Service: CognitoIdentityProvider, Status Code: 400, Request ID: 15e8d8f2-cdc1-4d7f-b558-141d94d6a585) (SDK Attempt Count: 1)" (RequestToken: 8ce51d45-2ff8-2294-c359-4883261ea5e5, HandlerErrorCode: InvalidRequest)
```
