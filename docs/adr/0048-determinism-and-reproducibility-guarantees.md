# 0048 Determinism and reproducibility guarantees

## Status

Accepted

## Context

Users and tests need repeated analysis to produce the same result for the same input.

## Decision

Diagnostic manifests are deterministic:

- Stable key ordering.
- Deterministic source IDs and checksums.
- No wall-clock timestamps in fixture diagnostics.
- Sorted anomalies, errors, suggestions, and dependencies.

Runtime history may contain timestamps, but exported provenance separates runtime events from deterministic diagnostics.

## Consequences

Fixture tests can assert byte-identical output.

## Alternatives considered

- Including current timestamps in every manifest: rejected because it breaks reproducibility.
