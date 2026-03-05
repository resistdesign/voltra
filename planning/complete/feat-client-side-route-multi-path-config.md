# Feature: Client-Side Route Multi-Path Configuration

Right now the `Route` component (be it app/web/native) takes either a string or array of strings as the `path` prop.

But sometimes, we need some paths in the array to be `exact` matches and some paths to not require an `exact` match.

What we need to do:

- [x] Make a new type called `RoutePathConfig`. See below.
- [x] Make `Route` `path` accept `string | (string | RoutePathConfig)[]`.
- [x] Normalize matcher `path` from `string | (string | RoutePathConfig)[]` to `RoutePathConfig[]`.
- [x] Apply matcher `exact` prop when converting `string` entries to `RoutePathConfig`.
- [x] Match current path against each `RoutePathConfig` using that config's `exact` value.
- [x] Add app/web/native route tests for mixed path-config exactness behavior.
- [x] Verify via `yarn test src/app/utils/Route.spec.json src/web/utils/Route.spec.json src/native/utils/Route.spec.json`.

`RoutePathConfig` type:

```typescript
type RoutePathConfig = {
  path: string;
  exact?: boolean;
};
```
