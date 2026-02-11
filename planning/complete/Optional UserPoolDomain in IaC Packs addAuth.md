# Optional UserPoolDomain in IaC Packs addAuth

## Goal
Make `UserPoolDomain` optional in the IaC `addAuth` pack, avoid passing unused parameters when disabled, and align docs/tests/examples.

## Checklist
- [x] Identify all `addAuth` pack code paths that always create/configure `UserPoolDomain`.
- [x] Introduce an explicit optional configuration for enabling/disabling `UserPoolDomain`.
- [x] Ensure no domain-specific parameter/value is emitted when `UserPoolDomain` is disabled.
- [x] Update public types/doc comments for the new behavior.
- [x] Update docs/examples that reference `addAuth` default domain behavior.
- [x] Add or update spec tests covering both enabled and disabled domain cases.
- [x] Run targeted tests and validate behavior.
