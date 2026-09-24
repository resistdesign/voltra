# Health Operations Suite Improvements

## Goal

Make Voltra Health easier to operate during real index-healing work: expose useful progress and findings, reduce self-generated Health-store churn, and make bounded maintenance more resistant to non-progress loops.

## Changes

- Treat a multi-pass audit as one logical Health run instead of creating one `run` record per bounded pass.
- Persist the active logical `runId` in the existing audit checkpoint and reuse it until the index/schema cycle completes.
- Keep pass-level results while accumulating cycle-level examined/orphan/repair/suspicious totals.
- Refresh the active run retention deadline while a long cycle is still progressing.
- Report per-pass structured/text document counts and the TypeInfo type names actually encountered.
- Add a read-only `progress()` surface for current phase completion, pass count, recent types, retention state, and active cycle status.
- Add a bounded/filterable `findings()` surface for inspecting persisted Health findings without manually browsing the backing table.
- Expose `healthProgress` and `healthFindings` through the Health MCP adapter.
- Detect structured/text maintenance cursors that fail to advance, persist a finding, and stop that source from trapping the audit in an infinite continuation loop.
- Keep retention cleanup opportunistic and independent from audit continuation semantics.

## Operational model

A Health **cycle** is one logical audit of the configured index/schema state. A cycle may require many bounded **passes**. The checkpoint carries resumable progress and the active cycle run id. Each pass updates that same run record; completion closes it. A later audit starts a new run.

This keeps run history meaningful and bounded while retaining detailed pass and cycle progress for operators and agents.

## Verification

- Existing Health monitor scenarios remain covered.
- Bounded continuation coverage verifies multiple passes reuse one logical run record.
- Findings filtering has direct monitor coverage.
- MCP coverage includes status, progress, findings, preview, and repair tools plus the expanded run result.
- Build/core/export/consumer checks are expected to run in CI.
