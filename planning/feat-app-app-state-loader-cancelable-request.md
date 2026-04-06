# Feat: App State Loader Cancelable Request

The Application State Loader needs the ability to cancel current requests when new requests are made.

We need to add a new property, something like `cancelPendingOnNewRequest`, to the `ApplicationStateLoaderConfig`.

It will, obviously, need to be passed through to the underlying service that `useApplicationStateLoader` uses.

----

Track phases in this file but DO NOT delete the summary.
