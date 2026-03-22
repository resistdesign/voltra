# Fix Native Route Parameters

When using React Native with a Web target, the Route `<Route path="details/:id">` works.

However, when using React Native with a Mobile target, the same Route does *NOT* work.

And it's not just that the Parameter isn't available or something... the Route doesn't even render at all when it
*SHOULD* match the current path.

We need native/mobile routing to work with Parameters, as web does.

## Goals

- Ensure native/mobile route matching receives the same parameterized path shape that web routing receives.
- Cover the failing mobile/native route-parameter case through Voltra-owned path/history routing coverage.
- Verify the targeted native route specs pass after the fix.
- Keep native routing documentation directly aligned with Voltra's mission: shared path/history routing with only mobile runtime mechanics abstracted behind native helpers.
- Keep `src/app` entirely free of native-platform behavior so web-only consumers cannot inherit mobile runtime concerns.
- Preserve correct behavior for React Native mobile and React Native web targets from the `native` barrel without breaking compilation or runtime behavior.

## Checklist

- [x] Reproduce the native route-parameter mismatch with a focused native route spec scenario.
- [x] Update native routing so mobile path handling stays fully within Voltra-owned path/history primitives.
- [x] Run targeted native route tests and confirm the regression is fixed.
- [x] Tighten native routing docs/examples/comments so Voltra-owned path/history routing is explicit and external navigation-state bridging is gone.
- [x] Remove the new native-platform back handling drift from `src/app` and relocate that ownership into `src/native`.
- [x] Ensure the `native` barrel cleanly auto-selects browser behavior for React Native web targets and native-history behavior for mobile targets.
- [x] Add/update tests and docs so future development keeps `app` platform-agnostic and `native` platform-owning.
