# Feature: Typed Application State Loader Return Props

## Problem:

Right now, `ApplicationStateValueController` `onChange` supports receiving a value of type `ApplicationStateValue` which
resolves to type `any`.

## Solution:

The `ApplicationStateValueController` needs support the following, key, important features:

1. `onChange` needs to be timeless. Meaning it's like a `useState` setter in React and doesn't need to be claimed as a
   dependency to other
   hooks because it will never be another instance and does not change.
2. `onChange` needs to accept a state "applier" function that supplies the previous value as an argument, just like a
   React `useState`
   setter.
3. `value` needs to have a Type based on an optional type applied to the `identifier: ApplicationStateIdentifier` passed
   to
   `useApplicationStateValue`.

To achieve this, a few things might need to happen:

1. The way `useApplicationStateValue` interacts with the `ApplicationStateContext` may need to fundementally change so
   that `ApplicationStateValueController` `onChange` ends up being and actual `useState` setter somehow. But maybe not.
2. `getApplicationStateIdentifier` will need some way to have a TypeScript generic applied to it, that
   `useApplicationStateValue` can detect and use. This could be challening given that `getApplicationStateIdentifier`
   just returns a unique object *AND* supports nesting.

## Affected Systems:

There are systems that use `useApplicationStateValue` and `ApplicationStateValueController`.

These systems will need to be updated to align with the new functionality and return types:

1. `useApplicationStateLoader`
2. `useApplicationStateValueStructure`

## Thorough Follow-Through:

Update/create all related/necessary tests/docs/doc-comments/READMEs/demos/examples/samples/etc.

# Phase 1:

Propose your implementation.

**DO NOT DO ANY WORK UNTIL YOUR PROPOSED SOLUTION HAS BEEN REVIEWED AND APPROVED.**
