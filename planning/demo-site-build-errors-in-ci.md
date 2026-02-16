# Demo Site Build Errors in CI

The demo site build is failing in CI.

```
Run yarn
yarn install v1.22.22
[1/4] Resolving packages...
[2/4] Fetching packages...
warning astro@5.16.6: The engine "pnpm" appears to be invalid.
warning typedoc@0.28.15: The engine "pnpm" appears to be invalid.
[3/4] Linking dependencies...
warning " > @vitejs/plugin-basic-ssl@2.1.0" has unmet peer dependency "vite@^6.0.0 || ^7.0.0".
warning " > react-native@0.84.0" has incorrect peer dependency "react@^19.2.3".
warning "react-native > @react-native/codegen@0.84.0" has unmet peer dependency "@babel/core@*".
warning "react-native > babel-jest@29.7.0" has unmet peer dependency "@babel/core@^7.8.0".
warning "react-native > babel-jest > babel-preset-jest@29.6.3" has unmet peer dependency "@babel/core@^7.0.0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax@1.2.0" has unmet peer dependency "@babel/core@^7.0.0 || ^8.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-async-generators@7.8.4" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-bigint@7.8.3" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-class-properties@7.12.13" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-class-static-block@7.14.5" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-import-attributes@7.28.6" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-import-meta@7.10.4" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-json-strings@7.8.3" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-logical-assignment-operators@7.10.4" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-nullish-coalescing-operator@7.8.3" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-numeric-separator@7.10.4" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-object-rest-spread@7.8.3" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-optional-catch-binding@7.8.3" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-optional-chaining@7.8.3" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-private-property-in-object@7.14.5" has unmet peer dependency "@babel/core@^7.0.0-0".
warning "react-native > babel-jest > babel-preset-jest > babel-preset-current-node-syntax > @babel/plugin-syntax-top-level-await@7.14.5" has unmet peer dependency "@babel/core@^7.0.0-0".
warning Workspaces can only be enabled in private projects.
[4/4] Building fresh packages...
Done in 28.93s.
yarn run v1.22.22
$ astro build && yarn finalize-site
22:19:11 [content] Syncing content
22:19:11 [content] Synced content
22:19:11 [types] Generated 392ms
22:19:11 [build] output: "static"
22:19:11 [build] mode: "static"
22:19:11 [build] directory: /home/runner/work/voltra/voltra/site-dist/app/
22:19:11 [build] Collecting build info...
22:19:11 [build] ✓ Completed in 414ms.
22:19:11 [build] Building static entrypoints...
22:19:12 [WARN] [vite] "isRemoteAllowed", "matchHostname", "matchPathname", "matchPort" and "matchProtocol" are imported from external module "@astrojs/internal-helpers/remote" but never used in "node_modules/astro/dist/assets/utils/remotePattern.js".
22:19:12 [vite] ✓ built in 848ms
22:19:12 [build] ✓ Completed in 883ms.

 building client (vite) 
22:19:12 [vite] transforming...
22:19:25 [vite] ✓ 169 modules transformed.
22:19:26 [vite] rendering chunks...
22:19:27 [vite] computing gzip size...
22:19:27 [vite] site-dist/app/_astro/index.DtY1pQcT.js       7.56 kB │ gzip:     2.99 kB
22:19:27 [vite] site-dist/app/_astro/client.B-Q6Mcth.js    136.51 kB │ gzip:    44.01 kB
22:19:27 [vite] site-dist/app/_astro/App.31K49mn-.js     4,283.86 kB │ gzip: 1,229.16 kB
22:19:27 [WARN] [vite] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
22:19:27 [vite] ✓ built in 15.49s

 generating static routes 
22:19:27 ▶ site/app/src/pages/index.astro
22:19:27   └─ /index.html (+17ms) 
22:19:27 ▶ /easy-layout-demo
22:19:27   └─ /easy-layout-demo/index.html (+4ms) 
22:19:27 ▶ /end-to-end-demo
22:19:27   └─ /end-to-end-demo/index.html (+2ms) 
22:19:27 ▶ /form-generation
22:19:27   └─ /form-generation/index.html (+3ms) 
22:19:27 ✓ Completed in 61ms.

22:19:27 [build] 1 page(s) built in 16.87s
22:19:27 [build] Complete!
$ yarn doc && yarn doc-to-site && cp CNAME site-dist/app/
$ typedoc
[info] Loaded plugin typedoc-material-theme
site/app/src/client/EndToEndDemo.tsx:18:31 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/components/DebugLogPanel.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/components/DebugLogPanel.tsx' only in casing.
  The file is in the program because:
    Imported via "./EndToEndDemo/components/DebugLogPanel" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation
    Root file specified for compilation

18 import { DebugLogPanel } from "./EndToEndDemo/components/DebugLogPanel";
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:19:28 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/components/ContextBar.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/components/ContextBar.tsx' only in casing.
  The file is in the program because:
    Imported via "./EndToEndDemo/components/ContextBar" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation
    Root file specified for compilation

19 import { ContextBar } from "./EndToEndDemo/components/ContextBar";
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:20:33 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/screens/CarRelateScreen.tsx' only in casing.
  The file is in the program because:
    Imported via "./EndToEndDemo/screens/CarRelateScreen" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation
    Root file specified for compilation

20 import { CarRelateScreen } from "./EndToEndDemo/screens/CarRelateScreen";
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:21:36 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CreatePersonScreen.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/screens/CreatePersonScreen.tsx' only in casing.
  The file is in the program because:
    Imported via "./EndToEndDemo/screens/CreatePersonScreen" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation
    Root file specified for compilation

21 import { CreatePersonScreen } from "./EndToEndDemo/screens/CreatePersonScreen";
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:22:34 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/screens/PeopleHomeScreen.tsx' only in casing.
  The file is in the program because:
    Imported via "./EndToEndDemo/screens/PeopleHomeScreen" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation
    Root file specified for compilation

22 import { PeopleHomeScreen } from "./EndToEndDemo/screens/PeopleHomeScreen";
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:23:36 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/PersonDetailScreen.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/screens/PersonDetailScreen.tsx' only in casing.
  The file is in the program because:
    Imported via "./EndToEndDemo/screens/PersonDetailScreen" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation
    Root file specified for compilation

23 import { PersonDetailScreen } from "./EndToEndDemo/screens/PersonDetailScreen";
                                      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:29:8 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/demoState.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/demoState.ts' only in casing.
  The file is in the program because:
    Root file specified for compilation
    Imported via "./EndToEndDemo/demoState" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation

29 } from "./EndToEndDemo/demoState";
          ~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:32:27 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/hooks/usePeople.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/hooks/usePeople.ts' only in casing.
  The file is in the program because:
    Root file specified for compilation
    Imported via "./EndToEndDemo/hooks/usePeople" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation

32 import { usePeople } from "./EndToEndDemo/hooks/usePeople";
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:33:25 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/hooks/useCars.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/hooks/useCars.ts' only in casing.
  The file is in the program because:
    Root file specified for compilation
    Imported via "./EndToEndDemo/hooks/useCars" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation

33 import { useCars } from "./EndToEndDemo/hooks/useCars";
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo.tsx:34:33 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/hooks/useRelationship.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/hooks/useRelationship.ts' only in casing.
  The file is in the program because:
    Root file specified for compilation
    Imported via "./EndToEndDemo/hooks/useRelationship" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation

34 import { useRelationship } from "./EndToEndDemo/hooks/useRelationship";
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

site/app/src/client/EndToEndDemo/components/DebugLogPanel.tsx:2:52 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/layout.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/layout.ts' only in casing.
  The file is in the program because:
    Root file specified for compilation
    Imported via "../layout" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/components/DebugLogPanel.tsx'
    Imported via "../layout" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx'
    Imported via "../layout" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CreatePersonScreen.tsx'
    Imported via "../layout" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx'
    Imported via "../layout" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/PersonDetailScreen.tsx'
    Imported via "./EndToEndDemo/layout" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation

2 import { InlineRow, LogGrid, Section, Stack } from "../layout";
                                                     ~~~~~~~~~~~

  site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx:6:65
    6 import { Grid, InlineRow, List, ListItem, Section, Stack } from "../layout";
                                                                      ~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/screens/CreatePersonScreen.tsx:5:25
    5 import { Section } from "../layout";
                              ~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx:2:58
    2 import { Grid, InlineRow, List, ListItem, Section } from "../layout";
                                                               ~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/screens/PersonDetailScreen.tsx:6:42
    6 import { Grid, InlineRow, Section } from "../layout";
                                               ~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo.tsx:24:23
    24 import { Stack } from "./EndToEndDemo/layout";
                             ~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.

site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx:5:27 - error TS1261: Already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/components/FormBlock.tsx' differs from file name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/components/FormBlock.tsx' only in casing.
  The file is in the program because:
    Imported via "../components/FormBlock" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx'
    Imported via "../components/FormBlock" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CreatePersonScreen.tsx'
    Imported via "../components/FormBlock" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/PersonDetailScreen.tsx'
    Root file specified for compilation
    Root file specified for compilation

5 import { FormBlock } from "../components/FormBlock";
                            ~~~~~~~~~~~~~~~~~~~~~~~~~

  site/app/src/client/EndToEndDemo/screens/CreatePersonScreen.tsx:4:27
    4 import { FormBlock } from "../components/FormBlock";
                                ~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/screens/PersonDetailScreen.tsx:5:27
    5 import { FormBlock } from "../components/FormBlock";
                                ~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.

site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx:7:47 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/utils.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/utils.ts' only in casing.
  The file is in the program because:
    Root file specified for compilation
    Imported via "../utils" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/CarRelateScreen.tsx'
    Imported via "../utils" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx'
    Imported via "./EndToEndDemo/utils" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Root file specified for compilation

7 import { formatCarLabel, toPositiveInt } from "../utils";
                                                ~~~~~~~~~~

  site/app/src/client/EndToEndDemo/screens/PeopleHomeScreen.tsx:3:31
    3 import { toPositiveInt } from "../utils";
                                    ~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo.tsx:30:35
    30 import { formatPersonLabel } from "./EndToEndDemo/utils";
                                         ~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.

site/app/src/client/endToEndDemo/hooks/useCars.ts:4:38 - error TS1149: File name '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/logging/demoLogger.ts' differs from already included file name '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/logging/demoLogger.ts' only in casing.
  The file is in the program because:
    Imported via "../logging/demoLogger" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/hooks/useCars.ts'
    Imported via "../logging/demoLogger" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/hooks/usePeople.ts'
    Imported via "../logging/demoLogger" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/hooks/useRelationship.ts'
    Root file specified for compilation
    Imported via "../logging/demoLogger" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo/components/DebugLogPanel.tsx'
    Imported via "./EndToEndDemo/logging/demoLogger" from file '/home/runner/work/voltra/voltra/site/app/src/client/EndToEndDemo.tsx'
    Imported via "../logging/demoLogger" from file '/home/runner/work/voltra/voltra/site/app/src/client/endToEndDemo/hooks/useCars.ts'

4 import type { RequestLogEntry } from "../logging/demoLogger";
                                       ~~~~~~~~~~~~~~~~~~~~~~~

  site/app/src/client/EndToEndDemo/hooks/useCars.ts:4:38
    4 import type { RequestLogEntry } from "../logging/demoLogger";
                                           ~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/hooks/usePeople.ts:4:38
    4 import type { RequestLogEntry } from "../logging/demoLogger";
                                           ~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/hooks/useRelationship.ts:5:38
    5 import type { RequestLogEntry } from "../logging/demoLogger";
                                           ~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo/components/DebugLogPanel.tsx:3:38
    3 import type { RequestLogEntry } from "../logging/demoLogger";
                                           ~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.
  site/app/src/client/EndToEndDemo.tsx:31:31
    31 import { useDemoLogger } from "./EndToEndDemo/logging/demoLogger";
                                     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    File is included via import here.

[error] Found 14 errors and 0 warnings
error Command failed with exit code 3.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
error Command failed with exit code 3.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
error Command failed with exit code 3.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
Error: Process completed with exit code 3.
```