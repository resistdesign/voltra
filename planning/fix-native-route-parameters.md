# Fix Native Route Parameters

When using React Native with a Web target, the Route `<Route path="details/:id">` works.

However, when using React Native with a Mobile target, the same Route does *NOT* work.

And it's not just that the Parameter isn't available or something... the Route doesn't even render at all when it
*SHOULD* match the current path.

We need native/mobile routing to work with Parameters, as web does.
