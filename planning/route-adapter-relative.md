# Route Adapter Relative

All client-side routing has a problem right now.

When I push to a route adapter (Either React Native Web/Android/iOS or Pure Web), it needs to understand relative URLs.

Here's how it works:

1. If I'm at `domain.com/signup` and I push/replace `"/confirm"` to a route adapter, it should go to
   `domain.com/confirm`.
2. If I'm at `domain.com/signup` and I push/replace `"confirm"` (no prefixed slash) to a route adapter, it should go to
   `domain.com/signup/confirm`.
3. If I'm at `domain.com/signup` and I push/replace `"./confirm"` (prefixed with current directory) to a route adapter,
   it should go to `domain.com/signup/confirm`.
4. If I'm at `domain.com/signup` and I push/replace `"../confirm"` (prefixed with move up one directory) to a route
   adapter, it should go to `domain.com/confirm`.
5. If I'm at `domain.com/signup/confirm` and I push/replace `"../complete"` (prefixed with move up one directory) to a
   route adapter, it should go to `domain.com/signup/complete`.
6. If I'm at `domain.com/signup/complete` and I push/replace `"../../login"` (prefixed with move up two directories) to
   a route adapter, it should go to `domain.com/login`.
7. If I'm at `domain.com/signup/complete` and I push/replace `"/"` (only a slash) to a route adapter, it should go to
   `domain.com`.
8. If I'm at `domain.com/signup/complete` and I push/replace `""` (and empty string) to a route adapter, it should go to
   `domain.com`.

Essentially, a slash `"/"` prefix is required to operate at the top path level. And empty string `""` means top level as
well.

If the RouteAdapter supplied to the RouteProvider is something like a raw browser history URL, then we will probably
need to wrap it before passing it to the RouteProvider. Native RouteAdapters will need to support the same
functionality.

Right now, when I use `Route` from either `app`, `web` or `native`, they all just work without needing to supply
anything. This is by design and must remain the case. So whatever logic is responsible for getting and supplying the
RouteAdapter will also need to apply the wrapper. If the wrapper can just wrap any RouteProvider, then it can live in
the `app` barrel.

The RouteAdapter type is as follows:

```typescript
/**
 * Platform adapter that supplies the current path and change notifications.
 */
export type RouteAdapter = {
  /** Read the current path. */
  getPath: () => string;
  /** Subscribe to path changes. */
  subscribe: (listener: (path: string) => void) => () => void;
  /** Optional navigation helper for adapters that can push state. */
  push?: (path: string, title?: string) => void;
  /** Optional navigation helper for adapters that can replace state. */
  replace?: (path: string, title?: string) => void;
  /** Optional navigation helper for adapters that can go backward. */
  back?: () => void;
  /** Optional capability check for backward navigation. */
  canGoBack?: () => boolean;
};
```

*TWO* functions should all understand this pathing syntax:

1. `push`: Should calculate the target path based on the above syntax and push it to the adapter.
2. `replace`: Should calculate the target path based on the above syntax and replace it in the adapter.
