# Proposal Plan: Top-Level `iac-packs` Docs Surface

## Status
- Executed

## Objective
Expose IaC packs as a top-level documentation module (peer to `iac`) while keeping runtime/package import paths unchanged (`@resistdesign/voltra/iac/packs`).

## Constraints
- Do not change runtime exports/import paths.
- Do not alter package API contracts unless explicitly approved.
- Keep TypeDoc warnings clean.

## Proposed Approach
1. Add a docs-only entrypoint module at `src/iac-packs/index.ts` that re-exports `../iac/packs`.
2. Update `typedoc.json` entry points to include `./src/iac-packs/index.ts` and remove direct `./src/iac/packs/index.ts` from docs entrypoints.
3. Keep existing `src/iac/packs/index.ts` as-is for package/runtime usage.
4. Validate that docs sidebar shows a top-level module for packs (label expected from entrypoint path, e.g. `iac-packs`).

## Checklist
- [x] Confirm desired top-level module label (`iac-packs` vs alternative naming)
- [x] Add docs-only entrypoint file `src/iac-packs/index.ts`
- [x] Adjust TypeDoc entrypoint list in `typedoc.json`
- [x] Run `yarn doc` and verify sidebar/module placement
- [x] Sanity-check no runtime/package export impact
- [x] Update plan status and capture verification notes

## Risks / Notes
- Sidebar naming is tied to entrypoint path/module resolution; exact label should be validated after generation.
- If TypeDoc still nests unexpectedly, fallback is explicit entrypoint naming configuration (if supported by current TypeDoc version/plugin stack).

## Acceptance Criteria
- Docs include a top-level packs module (not nested under `iac`).
- Runtime import path remains `@resistdesign/voltra/iac/packs`.
- `yarn doc` completes cleanly.

## Verification Notes
- Generated module page exists at `docs/modules/iac-packs.html` (top-level peer of `docs/modules/iac.html`).
- `yarn doc` completed cleanly.
- Runtime/package export mapping for packs remains unchanged in `package.json` (`./iac/packs` still points to `iac/packs/index.*`).
