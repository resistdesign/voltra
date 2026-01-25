# DBX CI Test Failures

CI exposed a bunch of issues that now need to be fixed:

```
Run yarn
yarn install v1.22.22
[1/4] Resolving packages...
[2/4] Fetching packages...
warning astro@5.16.6: The engine "pnpm" appears to be invalid.
warning typedoc@0.28.15: The engine "pnpm" appears to be invalid.
[3/4] Linking dependencies...
warning " > @astrojs/react@4.4.2" has unmet peer dependency "@types/react@^17.0.50 || ^18.0.21 || ^19.0.0".
warning " > @types/react-dom@18.3.7" has unmet peer dependency "@types/react@^18.0.0".
warning " > @vitejs/plugin-basic-ssl@2.1.0" has unmet peer dependency "vite@^6.0.0 || ^7.0.0".
warning Workspaces can only be enabled in private projects.
[4/4] Building fresh packages...
Done in 20.82s.
yarn run v1.22.22
$ astro build && yarn finalize-site
23:47:14 [content] Syncing content
23:47:14 [content] Synced content
23:47:14 [types] Generated 451ms
23:47:14 [build] output: "static"
23:47:14 [build] mode: "static"
23:47:14 [build] directory: /home/runner/work/voltra/voltra/site-dist/app/
23:47:14 [build] Collecting build info...
23:47:14 [build] ✓ Completed in 470ms.
23:47:14 [build] Building static entrypoints...
23:47:15 [WARN] [vite] "isRemoteAllowed", "matchHostname", "matchPathname", "matchPort" and "matchProtocol" are imported from external module "@astrojs/internal-helpers/remote" but never used in "node_modules/astro/dist/assets/utils/remotePattern.js".
23:47:15 [vite] ✓ built in 793ms
23:47:15 [build] ✓ Completed in 826ms.

 building client (vite) 
23:47:15 [vite] transforming...
23:47:27 [vite] ✓ 126 modules transformed.
23:47:27 [vite] rendering chunks...
23:47:29 [vite] computing gzip size...
23:47:29 [vite] site-dist/app/_astro/index.DtY1pQcT.js       7.56 kB │ gzip:     2.99 kB
23:47:29 [vite] site-dist/app/_astro/client.B-Q6Mcth.js    136.51 kB │ gzip:    44.01 kB
23:47:29 [vite] site-dist/app/_astro/App.D-JMrfYa.js     4,257.63 kB │ gzip: 1,220.85 kB
23:47:29 [WARN] [vite] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
23:47:29 [vite] ✓ built in 14.18s

 generating static routes 
23:47:29 ▶ site/app/src/pages/index.astro
23:47:29   └─ /index.html (+19ms) 
23:47:29 ▶ /end-to-end-demo
23:47:29   └─ /end-to-end-demo/index.html (+2ms) 
23:47:29 ▶ /form-generation
23:47:29   └─ /form-generation/index.html (+1ms) 
23:47:29 ✓ Completed in 79ms.

23:47:29 [build] 1 page(s) built in 15.58s
23:47:29 [build] Complete!
$ yarn doc && yarn doc-to-site && cp CNAME site-dist/app/
$ typedoc
[info] Loaded plugin typedoc-material-theme
src/api/DBX/DBX_SEARCH_EXACT_E2E.test-utils.ts:26:7 - error TS2741: Property 'backend' is missing in type '{ defaultIndexFieldByType: { Post: string; }; }' but required in type '{ backend: IndexBackend; defaultIndexFieldByType?: Record<string, string> | undefined; }'.

26       fullText: {
         ~~~~~~~~

  src/api/ORM/TypeInfoORMService.ts:191:5
    191     backend: IndexBackend;
            ~~~~~~~
    'backend' is declared here.

src/api/DBX/DBX_SEARCH_FULLTEXT_E2E.test-utils.ts:33:7 - error TS2741: Property 'backend' is missing in type '{ defaultIndexFieldByType: { Post: string; }; }' but required in type '{ backend: IndexBackend; defaultIndexFieldByType?: Record<string, string> | undefined; }'.

33       fullText: {
         ~~~~~~~~

  src/api/ORM/TypeInfoORMService.ts:191:5
    191     backend: IndexBackend;
            ~~~~~~~
    'backend' is declared here.

src/api/DBX/DBX_SEARCH_LOSSY_E2E.test-utils.ts:26:7 - error TS2741: Property 'backend' is missing in type '{ defaultIndexFieldByType: { Post: string; }; }' but required in type '{ backend: IndexBackend; defaultIndexFieldByType?: Record<string, string> | undefined; }'.

26       fullText: {
         ~~~~~~~~

  src/api/ORM/TypeInfoORMService.ts:191:5
    191     backend: IndexBackend;
            ~~~~~~~
    'backend' is declared here.

[error] Found 3 errors and 0 warnings
error Command failed with exit code 3.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
error Command failed with exit code 3.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
error Command failed with exit code 3.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
Error: Process completed with exit code 3.
```
