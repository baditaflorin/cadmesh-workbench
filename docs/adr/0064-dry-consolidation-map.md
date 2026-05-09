# 0064 DRY Consolidation Map

## Status

Accepted.

## Context

Phase 3 adds more input/output pathways. Duplicating file conversion and state JSON logic would make correctness fragile.

## Decision

Create a small Source Inspector helper layer for input conversion, workbench-state serialization, import, sharing, and persistence. Keep mesh/CAD engine logic in existing modules.

## Consequences

The component shrinks at the boundaries without adding a broad framework abstraction.

## Alternatives Considered

- Global state library: rejected as too much architecture for this small app.
