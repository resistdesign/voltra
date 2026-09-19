# Feature: API MCP Route Tools

- [x] Add protocol-correct MCP tool hosting that composes directly into a Voltra RouteMap.
- [x] Reuse normal Route auth for the whole MCP endpoint and expose tool handler/handlerFactory access to normalized caller context.
- [x] Preserve MCP HTTP status, headers, and body through the existing cloud-function router.
- [x] Abstract standard HTTP Response detection and avoid MCP-specific early-return handling in Router.
- [x] Add focused tests and a consumer example.
- [x] Verify tests/build/exports and open the PR.
