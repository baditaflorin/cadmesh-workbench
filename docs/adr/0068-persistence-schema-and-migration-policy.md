# 0068 Persistence Schema And Migration Policy

## Status

Accepted.

## Context

IndexedDB stored only arbitrary string preferences.

## Decision

Add a typed `workbenchState` value with schema version `phase3-workbench-state/v1`. Future incompatible changes add migration code before reading old state.

## Consequences

State import/export and reload restore use the same schema.

## Alternatives Considered

- Persist raw React state: rejected because it is not a stable artifact contract.
