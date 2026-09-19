# Feature: Demo MCP

- [x] Add a generic TypeInfoPack -> JSON Schema conversion utility with coverage for primitives, arrays, references, constraints, literals, optionals, and unions.
- [x] Make MCP tool schemas TypeInfo-first: accept inputTypeInfo/outputTypeInfo and perform JSON Schema conversion internally.
- [x] Define demo MCP input/output contracts as exported TypeScript types and generate them through the existing demo TypeInfoMap pipeline.
- [x] Remove all hand-written MCP JSON Schema from the demo and use generated TypeInfo packs instead.

- [x] Add a public, read-only MCP endpoint to the live demo RouteMap using the existing demo ORM.
- [x] Expose focused demo tools for people and cars with bounded schemas.
- [x] Add a small MCP demo page to the docs/demo site with the live endpoint and tool descriptions.
- [x] Ensure browser MCP clients can preflight the standard MCP HTTP headers.
- [x] Surface the live MCP endpoint from the demo IaC stack.
- [x] Add/adjust focused tests and verify site/API/IaC builds.
- [x] Open the fast-follow PR.
