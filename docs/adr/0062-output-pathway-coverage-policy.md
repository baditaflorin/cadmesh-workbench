# 0062 Output Pathway Coverage Policy

## Status

Accepted.

## Context

GLB export existed, but diagnostics and state could not be taken out or restored.

## Decision

Expose download JSON, copy JSON, state download/import, share hash for small states, print report, and copy backend curl. Screenshot/embed remain out of scope.

## Consequences

Diagnostics become a real deliverable, not a hidden debug panel.

## Alternatives Considered

- Only export GLB: rejected because diagnostic/provenance data is the real Phase 2 output.
