# 0065 Module Boundaries And Dependency Direction

## Status

Accepted.

## Context

UI components should not become the only place where state and export formats are defined.

## Decision

Dependency direction remains UI -> feature helpers -> lib primitives. Persisted state schemas live in the feature helper layer and import only domain types.

## Consequences

State migration and output format tests can run without React.

## Alternatives Considered

- Put all state in App: rejected because Source Inspector owns the diagnostic contract.
