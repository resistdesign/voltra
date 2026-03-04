# Fix app service request path slash parsing

When you set a `basePath` and a `path` on a `RemoteProcedureCall` and use `src/app/utils/Service.ts`
`sendServiceRequest`, it will double up slashes if you prepend `path` with a slash.

Example:

`basePath: "/api"`
`path: "/method"`

And then the request is made to `/api//method`.

There are Route path parsing utils in the `common` barrel that it could be using to avoid these problems, and it should
be using them.

And it actually does seem to be using `mergeStringPaths`, so I'm wondering what the issue is.

Please discover the source of the problem and let's:

1. Get some better tests around all of this.
2. Fix it.
3. Make sure we didn't regress anything else because of this fix.
