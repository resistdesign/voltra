# Feature: Client-Side Route Multi-Path Configuration

Right now the `Route` component (be it app/web/native) takes either a string or array of strings as the `path` prop.

But sometimes, we need some paths in the array to be `exact` matches and some paths to not require an `exact` match.

What we need to do:

1. Make a new type called `RoutePathConfig`. See below.
2. Make it so `Route` `path` now accepts `string | (string | RoutePathConfig)[]`.
3. Internally, `Route` currently normalizes `string | string[]` to `string[]`. Now, it needs to normalize
   `string | (string | RoutePathConfig)[]` to `RoutePathConfig[]`.
4. When converting a `string` to a `RoutePathConfig`, it will use the valud of `exact` from props and apply it to the
   `RoutePathConfig`.
5. When testing the current path against each `RoutePathConfig`, it will use the `exact` value from the
   `RoutePathConfig`.

`RoutePathConfig` type:

```typescript
type RoutePathConfig = {
  path: string;
  exact?: boolean;
};
```
