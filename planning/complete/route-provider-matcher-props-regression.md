# Plan: Route Provider Matcher Props Regression

## Goal

Fix the runtime regression where `<Route exact>` (without `path`) throws:
"Route provider mode does not support matcher props..."

## Checklist

- [x] Update `src/app/utils/Route.tsx` so matcher props (`exact`, `onParamsChange`) without `path` are treated as matcher mode (`path = ""`) instead of provider mode.
- [x] Preserve provider-only behavior for true root-provider usage (`<Route>` with no matcher props).
- [x] Add/adjust route tests for `<Route exact>` without `path` in a nested/provider context.
- [x] Run targeted route specs to verify fix and avoid regressions.
