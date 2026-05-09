# 0063 Half-Baked Feature Triage Decisions

## Status

Accepted.

## Context

Half-baked controls make the app feel unreliable.

## Decision

- Finish Mesh Repair/Decimate on imported mesh scene data.
- Finish diagnostic output controls.
- Finish backend Check with errors and curl copy.
- Finish session restore/clear.
- Keep CAD/Photo backend queue as preview-only; do not hide because result-mode warnings are now explicit.

## Consequences

No production UI control remains a stub. Native execution remains a documented limitation.

## Alternatives Considered

- Hide backend queue controls: rejected because they are useful for server smoke and already truth-labeled.
