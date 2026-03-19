# Fix routing utils exports and path format

## 3 major issues:

1. When using `useRouteContext`, properties like `parentPath` are in the wrong, raw and unprocessed format. We should
   see something like `main/details`, but what we see instead, is something like `"main"/"deatails"`. The quoted format
   means we have JSON parts separated by a delimiter. This is correct for internal processing but confusing for
   consumers. We need the parent path in a normalized "internal" format for handling, but we also need something for
   consumers to use in their client side apps. And doc-comments will be clutch to help them understand what to expect.
2. The second issue is in fact the doc-comments around this. `RouteContextType` does *not* have doc-comments but it
   DEFINITELY SHOULD. As well as it's properties. Very nice, explanatory doc-comments.
3. And lastly, we are *not* properly exporting utils like `getPathArray` and `getPathString` fromt he `common` barrel.
   These are VERY useful utilities that MUST be exported for consumers. And ANY AND ALL utils, from the common Routing
   collection, needs to be exported as well.

## Follow Through:

We want to be clean, explicit, professional and thorough.

Make sure that tests/demos/examples/samples/docs/doc-comments/READMEs/exports/etc are all cleaned-up and updated to
properly reflect all changes.
