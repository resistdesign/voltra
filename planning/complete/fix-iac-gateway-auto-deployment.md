# Fix IaC Gateway Auto Deployment

## Goal

Ensure `src/iac/packs/gateway.ts` automatically invalidates `AWS::ApiGateway::Deployment` only when gateway
deployment-relevant configuration changes, while keeping manual override support.

## Checklist

- [x] Verify current behavior of deployment updates in `addGateway`.
- [x] Determine whether a change is needed to force redeploy when API Gateway config changes.
- [x] Evaluate deterministic/hash-based invalidation scoped to gateway-related resources.
- [x] Report findings and recommendation only (no implementation).
- [x] Implement deterministic gateway deployment hash generation in `addGateway`.
- [x] Keep `deploymentSuffix` as a manual override layered onto auto hash behavior.
- [x] Add/update JSON spec tests to validate stable and changing deployment IDs.
- [x] Run targeted tests and record results.

## Findings (pre-implementation)

- `addGateway` currently builds deployment logical id as `"${id}GatewayRESTAPIDeployment${deploymentSuffix}"`.
- `deploymentSuffix` defaults to an empty string and is not auto-generated.
- In real stack usage (`site/iac/index.ts`), `addGateway` is called without `deploymentSuffix`, so logical id stays
  stable across updates.
- A stable deployment logical id means CloudFormation does not create a fresh API Gateway deployment snapshot when only
  methods/resources/integration config change.
- `DependsOn` only enforces creation order; it does not cause replacement unless the deployment resource itself changes.

## Implementation Notes

- Build a canonicalized payload from deployment-relevant gateway config only.
- Generate a deterministic short hash from that payload.
- Use logical id pattern: `${id}GatewayRESTAPIDeployment${hash}${deploymentSuffix}`.
- Maintain manual bump escape hatch via `deploymentSuffix`.

## Verification

- Ran `tsx src/common/Testing/CLI.ts "./src/iac/packs/gateway.spec.json"`.
- Result: 21 passed, 0 failed, 0 errors.
