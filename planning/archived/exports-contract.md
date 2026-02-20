# Voltra Import Contract (Working Draft)

The following imports are required to resolve from supported public subpaths.

## API
```ts
import { RouteMap } from "@resistdesign/voltra/api";
```

## Common
```ts
import type { TypeInfo } from "@resistdesign/voltra/common";
import { TypeInfoORMServiceError } from "@resistdesign/voltra/common";
```

## Entry Point Policy
- Supported: `@resistdesign/voltra/api`, `@resistdesign/voltra/app`, `@resistdesign/voltra/common`, `@resistdesign/voltra/web`, `@resistdesign/voltra/native`, `@resistdesign/voltra/iac`, `@resistdesign/voltra/iac/packs`, `@resistdesign/voltra/build`.
- Unsupported: `@resistdesign/voltra` root import.

## Validation Notes
This contract will be expanded in later phases and validated by export/consumer checks and smoke fixtures.
