# React Prop Callback Stability Plan

## Goal
Ensure all JSX event handlers in `site/` and `src/` avoid inline function instances by using stable memoized callbacks and/or extracted handler references.

## Checklist
- [x] Scan `site/` and `src/` for JSX props receiving inline/raw function values.
- [x] Review each case and convert appropriate component-prop callbacks to `useCallback`.
- [x] Add or update imports for `useCallback` where required.
- [x] Verify no behavioral regressions via targeted checks/tests.
- [x] Update this checklist with final status and notes.
- [x] Expand scope to remove remaining inline JSX handlers on intrinsic elements (`input`, `button`, `select`, etc.).
- [x] Refactor remaining inline handlers in `site/app/src/client/AdvancedDemo.tsx`.
- [x] Refactor remaining inline handlers in `site/app/src/client/EasyLayoutDemo.tsx`.
- [x] Refactor remaining inline handlers in `site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx`.
- [x] Refactor remaining inline handlers in `site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx`.
- [x] Refactor remaining inline handlers in `src/web/forms/suite.tsx`.
- [x] Re-scan for inline handlers and verify zero remaining matches for the inline-handler pattern.
- [x] Re-run regression tests after full inline-handler refactor.

## Notes
- Updated component-prop callback stability in:
  - `site/app/src/client/EndToEndDemo.tsx`
  - `site/app/src/client/EndToEndDemo/screens/CreatePersonScreen.tsx`
  - `site/app/src/client/AdvancedDemo.tsx`
- Validation: `yarn test` (passes, including `test:core` and `test:native`).
- Scope expanded per user request to remove all inline JSX handlers, including intrinsic element handlers.
- Added intrinsic-element handler refactors in:
  - `site/app/src/client/EasyLayoutDemo.tsx`
  - `site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx`
  - `site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx`
  - `src/web/forms/suite.tsx`
- Inline handler scan result: no remaining matches in `site/` and `src/` for JSX inline arrow/function handlers.
