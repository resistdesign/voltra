# Repository Guidelines

## Agent Startup

- The **user prompt is the authoritative starting instruction** for this run.
- Open `planning/` early. The active plan is the file directly under `planning/` (not inside `planning/complete/`).
- If multiple active plans exist, ask the user which to run.
- If no active plan exists:
  - If the user prompt contains a plan, checklist, or task list: **save it as a new active plan file in `planning/`**,
    then proceed.
  - If the user prompt describes work but is not already a plan: create a brief plan in `planning/` (goals + checklist),
    then proceed.
  - Only ask where work is tracked if the user prompt provides insufficient detail to create a plan.

## Project Structure & Module Organization

- `src/` holds the TypeScript source. Key areas include `src/api/`, `src/app/`, `src/common/`, and `src/iac/`.
- Tests are JSON specs alongside code, matched by `src/**/*.spec.json`.
- API docs are generated into `docs/` (TypeDoc output) and copied into `site-dist/` for the documentation site.
- `site/` contains Astro and site build tooling; `public/` and `assets/` hold static assets.

## Build, Test, and Development Commands

- `yarn build` compiles TypeScript and prepares the `dist/` package contents.
- `yarn test` runs the custom JSON spec runner on `src/**/*.spec.json`.
- `yarn test:gen` regenerates spec fixtures with the same runner.
- `yarn doc` generates TypeDoc output in `docs/`.
- `yarn start` runs the Astro docs app locally with HTTPS.
- `yarn site:build:app` builds the Astro app and finalizes site artifacts.

## Coding Style & Naming Conventions

- ***NEVER EVER EVER*** import `.ts` files using the `.js` extension. This is a TypeScript project, and that makes NO
  sense at all... AND... It is entirely unnecessary.
- TypeScript is the primary language; use 2-space indentation and double quotes, matching existing files in `src/`.
- Use `PascalCase` for types/classes and `camelCase` for functions/variables.
- Generated IaC files (for example `src/iac/types/*.ts`) should be edited via scripts like `yarn iac:types:gen` rather
  than by hand.
- Prettier is available in dependencies; run it ad hoc if formatting diverges, since no lint script is configured.

## Testing Guidelines

- Tests are JSON spec files named `*.spec.json` under `src/`.
- Use `yarn test` locally; use `yarn test:gen` when updating or creating fixtures.
- Keep new specs close to the feature area they validate (for example `src/api/foo.spec.json`).

## Commit & Pull Request Guidelines

- Commit messages follow a Conventional Commits pattern such as `feat:`, `doc:`, or `chore:` with optional scopes like
  `feat: (api) Add indexer`.
- Keep subjects imperative and concise; automated commits may appear as `chore: (repo) Automatic commit`.
- PRs should include a clear summary, linked issues when available, and screenshots for UI/site changes.
- Note any test commands run (or reasons for skipping) in the PR description.

## Agent Workflow & Progress Tracking

- Treat the **user prompt** as the authoritative scope for this run; do not down-scope without explicit user approval.
- Treat the `planning/` directory as the authoritative persisted work state once a plan exists. The active plan is the
  file directly under `planning/` (not inside `planning/complete/`).

- Work in **phases**:
  - At the start of a run, identify the next achievable group of checklist items (a “phase”) from the current plan.
  - Phases are **sequential by default** and form a single ordered queue.
  - Do NOT treat later phases as alternatives unless the plan explicitly marks them as optional or branching.
  - A phase should be sized to complete cleanly in the current run without guesswork or scope changes.
  - If a phase is too large or contains uncertainty, split it and proceed with the smallest clearly-achievable subset.

- Default to **forward progress**:
  - **Plan order is mandatory.**
  - Execute checklist items strictly in plan order whenever possible.
  - Do NOT present alternative next steps or choices when the next plan item is clear.
  - Do NOT ask whether to continue when unchecked plan items remain.
  - State the next planned action directly.
  - Only ask or offer options when the plan is ambiguous, blocked, or explicitly requests a decision.

- When the user says "start the next task," proceed immediately using the current plan order; keep communication brief
  while remaining thorough.

- Before starting work on a multi-item request, enumerate the specific checklist items or plan rows you will complete
  in this run (the current phase). This is a declaration of intent, not a choice list.

- Maintain a live checklist while working; update it as each item is completed so progress is visible and verifiable.
- Only mark an item `[x]` when it is fully complete (all required edits done and, when applicable, tests or verification
  steps run).
- When all sub-items in a parent checklist section are marked `[x]`, mark the parent item `[x]` as well to reflect
  completion of the whole area.
- When all items in a plan are complete **and the user agrees the work is finished**, move the plan file to
  `planning/complete/` to mark it as closed.

- For checklist-driven tasks, always update the relevant planning document(s) in the same response before declaring
  completion.
- Keep repo-wide rules in this file, and put effort-specific guidance in the relevant planning document.
- If a task cannot be completed in one pass, mark it `[~]` and explicitly list what remains.
- Provide concrete evidence of progress when asked (e.g., `git diff --stat`, specific files edited, or test outputs).
- If scope changes become necessary, pause and ask the user before proceeding; do not assume consent.

## Execution Style

- Default to forward progress: make reasonable decisions and proceed without waiting for confirmation, unless a scope
  change or destructive action would require it.
- Keep requests scoped; do not expand beyond the specified area without explicit approval.
- Prefer correctness and alignment with repo conventions over tidying git status; never revert unrelated changes.

## Naming & Organization Details

- Component-centric files use ClassCase, with related sub-files placed inside a folder sharing that component name.
- Utility-oriented files use camelCase.
- Major module acronyms may be uppercase (e.g., ORM).
- `src/iac/packs/` follows its own naming conventions due to consumption patterns.

## Documentation, Tests, and Exports

- Add doc comments for new or changed public types/functions in `src/`.
- Add or update nearby JSON spec tests for new behavior.
- Ensure exports align with existing barrels and entrypoints; follow established patterns.
