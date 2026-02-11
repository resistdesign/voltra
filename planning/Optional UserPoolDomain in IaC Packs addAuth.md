# Optional UserPoolDomain in IaC Packs addAuth

In the `addAuth` pack, the UserPoolDomain is, currently, always added.

We need to make it optional.

We need to make sure that no unnecessary parameters/values are passed in, if we do not enable the user pool domain.

Documentation, doc comments, tests, examples and all of that need to be updated.
