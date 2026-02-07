# ORM Route Map Explicit Single-Instance Refactor

## Goals

- Refactor `getTypeInfoORMRouteMap` internals to avoid dynamic method wiring.
- Use a single `TypeInfoORMService` instance and set `useDAC` based on presence of `dacConfig`.
- Define one route per public ORM API method explicitly.
- Destructure route args and call ORM methods with explicit named parameters.
- Preserve external behavior and outputs exactly as they are today.

## Phase 1 - Refactor RouteMap Internals

- [x] Analyze current route-map behavior and enumerate equivalence requirements from existing tests.
- [x] Refactor `getTypeInfoORMRouteMap` to instantiate one ORM service with config-driven `useDAC`.
- [x] Replace dynamic method dispatch with explicit handler factories for each public route.
- [x] Pass arguments explicitly by position/name for each method (no dynamic arg spreading).
- [x] Run targeted ORM route-map and ORM service specs to verify unchanged behavior.
