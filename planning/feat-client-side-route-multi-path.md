# Feature: Client-Side Route Multi-Path Handling

Right now, the client side `Route` component (be it web/native/app) takes a `path` prop that is a single string.

However, sometimes you want to show a screen or some components, in the route, for more than just one path.

What we need to do:

1. Make `path` either a string or an array of strings.
2. Make sure that there is no regression and that existing mechanics still work.
3. Internally, `Route` needs to decide to show it's children based on the current path matching one of it's given paths.

Normalization is preferable. Meaning `Route` should receive `path` and convert it to an array of strings whether it is a
single string or an array of strings already.

Then, `Route` can test the current navigation path against each path in it's array of paths.
