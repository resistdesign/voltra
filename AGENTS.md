# Repository Guidelines

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
- TypeScript is the primary language; use 2-space indentation and double quotes, matching existing files in `src/`.
- Use `PascalCase` for types/classes and `camelCase` for functions/variables.
- Generated IaC files (for example `src/iac/types/*.ts`) should be edited via scripts like `yarn iac:types:gen` rather than by hand.
- Prettier is available in dependencies; run it ad hoc if formatting diverges, since no lint script is configured.

## Testing Guidelines
- Tests are JSON spec files named `*.spec.json` under `src/`.
- Use `yarn test` locally; use `yarn test:gen` when updating or creating fixtures.
- Keep new specs close to the feature area they validate (for example `src/api/foo.spec.json`).

## Commit & Pull Request Guidelines
- Commit messages follow a Conventional Commits pattern such as `feat:`, `doc:`, or `chore:` with optional scopes like `feat: (api) Add indexer`.
- Keep subjects imperative and concise; automated commits may appear as `chore: (repo) Automatic commit`.
- PRs should include a clear summary, linked issues when available, and screenshots for UI/site changes.
- Note any test commands run (or reasons for skipping) in the PR description.

## Agent Workflow & Progress Tracking
- Treat user requests as the authoritative scope; do not down-scope without explicit user approval.
- Start every task by confirming whether the full scope can be completed in a single uninterrupted attempt; if not, communicate that immediately and agree on phased delivery.
- Before starting work on a multi-item request, enumerate the specific checklist items or plan rows you will complete.
- Maintain a live checklist while working; update it as each item is completed so progress is visible and verifiable.
- Only mark an item `[x]` when it is fully complete (all required edits done and, when applicable, tests or verification steps run).
- If a task cannot be completed in one pass, mark it `[~]` and explicitly list what remains.
- Provide concrete evidence of progress when asked (e.g., `git diff --stat`, specific files edited, or test outputs).
- If scope changes become necessary, pause and ask the user before proceeding; do not assume consent.
