# 0046 Performance budgets per operation

## Status

Accepted

## Context

Real CAD/mesh/photo files can be large enough to freeze a browser if parsed naively.

## Decision

Budgets:

- Preflight under 15 MB: median under 1 second, p95 under 2 seconds.
- Any operation over 300 ms shows progress/state.
- Any operation expected over 5 seconds must be cancellable or explicitly backend-only.
- Worker parsing samples large files where full parsing is unnecessary.
- The UI thread must not perform heavy geometry parsing.

## Consequences

Large inputs can receive honest warnings before full processing.

## Alternatives considered

- Always full parse: rejected for performance.
