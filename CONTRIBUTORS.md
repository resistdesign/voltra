# Contributors

Thanks for helping improve Voltra. This file captures the project expectations that are
useful when making changes, reviewing code, or contributing new features.

## Project Structure

- `src/` holds the TypeScript source.
- `src/api/`, `src/app/`, `src/common/`, and `src/iac/` are the primary domains.
- Tests live as JSON specs alongside code under `src/**/*.spec.json`.
- `site/` contains the Astro docs app and tooling. Built docs go into `docs/` and `site-dist/`.

## Development Commands

- `yarn build` compiles TypeScript and prepares `dist/`.
- `yarn test` runs the JSON spec runner on `src/**/*.spec.json`.
- `yarn test:gen` regenerates spec fixtures.
- `yarn doc` generates TypeDoc output in `docs/`.
- `yarn start` runs the Astro docs app locally with HTTPS.
- `yarn site:build:app` builds the Astro app and finalizes site artifacts.

## Coding Style

- TypeScript is primary. Use 2-space indentation and double quotes.
- Use `PascalCase` for types/classes, `camelCase` for functions/variables.
- Keep comments concise and focused on intent or non-obvious behavior.
- Generated IaC files (for example `src/iac/types/*.ts`) should be edited via scripts such
  as `yarn iac:types:gen` rather than by hand.

## File and Folder Naming

Naming reflects how modules are organized and consumed:

- **Component-centric files** use `ClassCase` (PascalCase) and represent a single primary component.
  - Example: `src/api/ORM/drivers/S3FileItemDBDriver.ts`
- **Component sub-files** live in a folder named after the component and also use `ClassCase`.
  - Example: `src/api/ORM/drivers/S3FileItemDBDriver/S3FileDriver.ts`
- **Area folders** are lowercased when they group related functionality rather than a single component.
  - Example: `src/api/ORM/drivers/`
- **Major system areas** use `ClassCase` or `ClassCase` acronyms when they represent a core subsystem.
  - Example: `src/api/ORM/` (ORM is a ClassCase acronym)
- **Utility-oriented files** use `camelCase` and are grouped by topic.
  - Example: `src/common/IdGeneration/getSimpleId.ts`

### Explicit Exception

- Everything under `src/iac/packs/` is an exception to these naming rules due to how pack files are consumed.

### Indexing Scope

- `src/api/Indexing` follows the same conventions. Component files should be `ClassCase`, utility files
  should be `camelCase`, and sub-files should live under a `ClassCase` component folder when they are
  part of a single component.

## Testing Guidance

- Keep new specs close to the feature area they validate (for example `src/api/foo.spec.json`).
- Use `yarn test` locally when changing behavior.
- Use `yarn test:gen` when updating or creating fixtures.

## Docs

- Update TypeDoc comments when public surfaces change.
- If `docs/` or the site output changes, note it in your PR and include screenshots for UI changes.

## Commits and PRs

- Commit messages follow Conventional Commits, such as `feat:`, `fix:`, or `chore:`.
- Keep subjects imperative and concise; optional scopes are welcome (for example `feat: (api) ...`).
- PRs should include a summary, linked issues when available, and tests run or skipped.

## Plan Tracking

- The authoritative plan lives in `planning/`.
- The active plan is the file directly under `planning/` (not inside `planning/complete/`).
- If multiple active plans exist, ask which to use; if none exist, ask where the task is tracked.
