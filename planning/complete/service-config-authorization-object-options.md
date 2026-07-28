# ServiceConfig Authorization Object Options

## Goal

Ensure every `ServiceConfig` consumer fully supports authorization supplied as either a bearer-token string or the new
object form, and cover the object form with a regression test.

## Checklist

- [x] Audit all `ServiceConfig` definitions, consumers, forwarding paths, and existing tests.
- [x] Update every affected implementation and public documentation for the authorization object option.
- [x] Add nearby regression coverage for the new authorization object option.
- [x] Run focused tests and relevant build/type verification.
