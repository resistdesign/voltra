# Voltra

![Voltra Logo 2025.svg](https://docs.voltra.app/images/Voltra%20Logo%202025.svg "Voltra")

------------

[See The Demos](https://docs.voltra.app)

## Usage

### Install

```bash
yarn add @resistdesign/voltra
```

Runtime peer dependencies:

- Consumers must provide `react` (required).
- Web consumers must provide `react-dom`.
- Native consumers must provide `react-native`.

### Imports

Prefer the public entrypoints below to keep imports stable and IDE auto-imports clean.

The root import `@resistdesign/voltra` is intentionally unsupported to avoid
cross-runtime bundling issues.

Preferred:

```ts
import { SimpleCFT } from "@resistdesign/voltra/iac";
import { addDNS } from "@resistdesign/voltra/iac/packs";
```

Not supported:

```ts
import addDNS from "@resistdesign/voltra/iac/packs/dns";
```

Public entrypoints:

- `@resistdesign/voltra/api`
- `@resistdesign/voltra/app`
- `@resistdesign/voltra/common`
- `@resistdesign/voltra/web`
- `@resistdesign/voltra/native`
- `@resistdesign/voltra/iac`
- `@resistdesign/voltra/iac/packs`
- `@resistdesign/voltra/build`

Common imports by domain:

```ts
import { addRoutesToRouteMap, handleCloudFunctionEvent } from "@resistdesign/voltra/api";
import { TypeInfo, TypeInfoORMServiceError } from "@resistdesign/voltra/common";
import { parseTemplate, computeTrackPixels } from "@resistdesign/voltra/app";
import { AutoField, AutoForm, createWebFormRenderer, getEasyLayout } from "@resistdesign/voltra/web";
import { createNativeFormRenderer, makeNativeEasyLayout } from "@resistdesign/voltra/native";
import { SimpleCFT } from "@resistdesign/voltra/iac";
import { addDNS } from "@resistdesign/voltra/iac/packs";
import { getTypeInfoMapFromTypeScript } from "@resistdesign/voltra/build";
```

------------

## Build-time Type Parsing (Advanced)

Voltra exposes TypeScript compiler–powered parsing utilities intended **only for build-time tooling** (scripts,
generators, CI).

These APIs depend on the TypeScript compiler and **must not be imported into runtime code** (e.g. Lambdas, servers,
browsers).

Build entrypoint:

```ts
import {getTypeInfoMapFromTypeScript} from "@resistdesign/voltra/build";
```

Use this entrypoint for:

- Code generation
- Pre-build analysis
- Producing static artifacts (JSON / TS)

Do **not** import `@resistdesign/voltra/build` from runtime code.

## With our powers combined!

<table style="border: 0 solid black;">
<tbody>
<tr>
<td>Voltra is a state-of-the-art platform designed to streamline the creation of cloud infrastructure and complex web
applications. It features a robust API with RPC, CORS, and versatile authentication options, alongside dynamic app
development tools like TypeScript-driven form generation. The platform excels in Infrastructure as Code (IaC), offering
features like chainable stacks and comprehensive parameter support. Its intuitive interface simplifies the addition of
databases, storage, authentication, and functions through easy-to-use packs. Furthermore, Voltra enhances development
workflows with advanced state management, and a smart, lightweight routing system for React
front-end apps.</td>
<td><img src="https://docs.voltra.app/images/Voltra%20Incarnate.png" style="width: 400em;" /></td>
</tr>
</tbody>
</table>

## Features

App features include form generation via TypeInfo-driven AutoForm/AutoField with validation, constraints, and relation/custom handlers.

| API                                                                         | App                                                             | IaC                                                           |
|-----------------------------------------------------------------------------|-----------------------------------------------------------------|---------------------------------------------------------------|
| RPC                                                                         | Easy Layout                                                     | Full Parameter Support: Groups/Labels/Types/etc...            |
| Auth: Public/Secured/Role Based                                             | State Management                                                | Packs: Easy to add Database/Storage/Auth/Functions/etc...     |
| Routing: Nesting/Handlers/Injected Handlers                                 | Routing: Param Handlers/Parallel Routes/Hooks                   | Utilities: Patching Stacks/Constants/Standard Includes/etc... |
| ORM: TypeScript Type Driven Auto-generated Data Contexts with Relationships | Form Generation: AutoForm/AutoField + constraints/relations     | Typed Build Spec Creation                                     |
|                                                                             | Form Engine: validation, defaults, denied ops, custom type flow | Typed Resource Parameters                                     |

## EasyLayout (Web + Native + Core)

EasyLayout now has:

- Shared core parsing/math in `@resistdesign/voltra/app` (`parseTemplate`, `computeTrackPixels`, etc.).
- Web rendering via CSS Grid in `@resistdesign/voltra/web`.
- Native coordinate computation in `@resistdesign/voltra/native`.

### Reference Examples

- Index: `examples/README.md`
- Client routing: `examples/routing/app-routing.ts`
- Backend API routing: `examples/api/backend-routing.ts`
- Forms: `examples/forms/`
  - `examples/forms/auto-form-validation-customization.tsx`
- Layout: `examples/layout/`
- Common types: `examples/common/types.ts`
  - `examples/common/typeinfo-validation.ts`
- Build-time parsing: `examples/build/type-parsing.ts`

### Template syntax

```text
header header, 1fr
side main, 2fr
\ 100px 1fr
```

- Row lines: `<areas>, <row-track>` (row track optional)
- Column line: `\ <col-track> <col-track> ...`
- Supported units: `fr`, `px`, `%`
- Named areas must form rectangles

### Web usage

```tsx
import { getEasyLayout } from "@resistdesign/voltra/web";

const { layout: Layout, areas } = getEasyLayout(undefined, undefined, {
  gap: 12,
  padding: 16,
})`
  header header, 1fr
  side main, 2fr
  \ 1fr 2fr
`;
```

### Native usage

```tsx
import { makeNativeEasyLayout } from "@resistdesign/voltra/native";

const layout = makeNativeEasyLayout(`
  header header, 100px
  side main, 1fr
  \\ 1fr 2fr
`);

const coords = layout.computeNativeCoords({
  width: 320,
  height: 240,
  padding: 12,
  gap: 8,
});
```

### Web vs Native

| Runtime | Rendering model | Output |
|---------|------------------|--------|
| Web | CSS Grid (browser layout engine) | CSS template strings |
| Native | Computed absolute layout | `{ left, top, width, height }` per area |

## Routing (Web + Native)

Voltra routing is unified under `@resistdesign/voltra/app`.

Reference example: `examples/routing/app-routing.ts`

```tsx
import { Route } from "@resistdesign/voltra/app";

<Route>
  <Route path="/" exact>
    <HomeScreen />
  </Route>
  <Route path="/login" exact>
    <LoginScreen />
  </Route>
  <Route path="/signup" exact>
    <SignUpScreen />
  </Route>
</Route>;
```

How it works:

- Root `<Route>` (no `path`) is provider mode.
- Nested `<Route path="...">` entries are matcher mode.
- Strategy is auto-selected:
  - DOM + History API => browser history strategy.
  - Otherwise => in-memory native strategy.
- Native strategy automatically wires Android hardware back to route history.
  - If Voltra can go back (`history.index > 0`), it consumes the event and navigates back.
  - If Voltra cannot go back, the event is not consumed so OS/native container behavior continues.

Optional back affordances:

- `adapter.back?.()` navigates backward when supported.
- `adapter.canGoBack?.()` reports whether back navigation is currently possible.

Escape hatches (root-only):

- `initialPath` sets fallback startup path when no ingress URL exists.
- `adapter` allows full custom adapter control.
- `ingress` supports deep-link ingress wiring (`getInitialURL`, `subscribe`, URL mapping, push/replace mode).

If you are looking for backend request routing (Cloud Function/API event routing), see:

- `examples/api/backend-routing.ts`

## Form Suites (Web + Native + BYOCS)

Voltra's form system is split into a platform-agnostic core and platform suites:

- Core contracts live under `src/app/forms/core` (field kinds, suite resolution, renderer factories).
- Web DOM suite lives under `src/web/forms`.
- React Native suite lives under `src/native/forms`.

### Web Usage

```tsx
import { createWebFormRenderer } from "@resistdesign/voltra/web";

const { AutoField } = createWebFormRenderer();
```

Override a single renderer:

```tsx
import { withRendererOverride } from "@resistdesign/voltra/app";
import { createWebFormRenderer } from "@resistdesign/voltra/web";

const { AutoField } = createWebFormRenderer({
  suite: withRendererOverride("string", (ctx) => {
    return <input value={(ctx.value as string) || ""} onChange={(e) => ctx.onChange(e.target.value)} />;
  }),
});
```

### Native Usage

```tsx
import { createNativeFormRenderer } from "@resistdesign/voltra/native";

const { AutoField } = createNativeFormRenderer();
```

### BYOCS (Bring Your Own Component Suite)

Provide partial overrides (renderers and/or primitives). Missing renderers are filled from the default suite and validated.

```tsx
import { createWebFormRenderer } from "@resistdesign/voltra/web";

const { AutoField } = createWebFormRenderer({
  suite: {
    primitives: {
      Button: ({ children }) => <button className="my-button">{children}</button>,
    },
    renderers: {
      boolean: (ctx) => (
        <label>
          <input
            type="checkbox"
            checked={!!ctx.value}
            onChange={(e) => ctx.onChange(e.target.checked)}
          />
          {ctx.label}
        </label>
      ),
    },
  },
});
```

### Relation + Custom Type Hooks

Renderers emit actions via:

- `onRelationAction(payload)` for relation fields
- `onCustomTypeAction(payload)` for custom types

Use these to wire modals, selectors, or editors without baking UI into the core engine.

### Centralized Validation

All TypeInfo data-item validation can be run directly from `@resistdesign/voltra/common`:

```ts
import { validateTypeInfoDataItem } from "@resistdesign/voltra/common";
```

`validateTypeInfoDataItem` supports:

- field-level `customValidatorMap` callbacks that return `ErrorDescriptor`
- `tags.validation` field options:
  - `validateHidden`
  - `validateReadonly`
  - `emptyArrayIsValid`

AutoForm passes validation through the same centralized logic and supports:

- `customValidatorMap` for app-specific rules
- `translateValidationErrorCode` for UI-facing messages
- multiple value-level errors per field
- per-index array item errors for array fields

Error-code constants are split by purpose:

- `PRIMITIVE_ERROR_MESSAGE_CONSTANTS` keys follow `typeof` (`string`, `number`, `boolean`)
- `DENIED_TYPE_OPERATIONS` keys follow `TypeOperation` (`CREATE`, `READ`, `UPDATE`, `DELETE`)
- `ERROR_MESSAGE_CONSTANTS` exposes canonical code-keyed entries (for example `NOT_A_STRING`, `DENIED_TYPE_OPERATION_CREATE`)

## Docs Site

The docs site is both reference documentation and a canonical usage example.
Key pieces:

- Astro app in `site/app` builds the UI into `site-dist/app` via `yarn site:build:app`.
- API bundle for the docs site is built by `yarn site:build:api` (see `site/build-api.mjs`) and written to
  `site-dist/api`.
- The IaC demo template is generated by `yarn site:build:iac` from `site/iac/index.ts` and written to
  `site-dist/iac/index.yml`.

API docs flow:

1) `yarn doc` generates TypeDoc output into `docs/`.
2) `yarn doc-to-site` copies `docs/` into `site-dist/app/`.
3) `yarn site:build:app` runs Astro and then `yarn finalize-site` to refresh the docs site with API docs.

## IaC Type Generation

IaC types are generated from the AWS CloudFormation resource specification.
When updating, follow this flow:

1) Download the latest CloudFormation resource specification JSON from AWS (region: `us-east-1`).
2) Replace the contents of `src/iac/types/CloudFormationResourceSpecification.ts` with the JSON payload (as the exported
   data).
3) Run `yarn iac:types:gen` to regenerate `dist/IaCTypes.ts`.
4) Verify `dist/IaCTypes.ts` looks correct, then commit both files.

Notes:

- `src/iac/types/IaCTypes.ts` and `src/iac/types/CloudFormationResourceSpecification.ts` are generated artifacts; do not
  edit by hand.
- The generator entrypoint is `src/iac/types/generate.ts` and uses `src/iac/types/Renderers.ts` for output.

## Releasing

Voltra publishes npm packages from GitHub Releases. The release tag is used verbatim
as the npm package version, so it must be valid SemVer without a leading `v`.

### Stable releases

Use tags like:

```
3.0.0
```

### Pre-releases (alpha, beta, rc)

Use tags like:

```
3.0.0-alpha.0
3.0.0-beta.1
3.0.0-rc.1
```

When the GitHub Release is marked as a prerelease, the npm publish step uses the
`next` dist-tag instead of `latest`. Consumers can install prereleases with:

```bash
yarn add @resistdesign/voltra@next
```

## Project

### Build and test commands

```bash
yarn build
yarn test
yarn test:gen
yarn doc
yarn start
yarn site:build:app
```

### Contribution guidelines

- Use Conventional Commits (`feat:`, `fix:`, `doc:`, `chore:`) with optional scopes.
- Keep subjects imperative and concise.
- Include test commands run (or reasons for skipping) in PR descriptions.
