# 0007 Data generation pipeline

## Status

Accepted

## Context

This ADR is mandatory for Mode B projects. The selected deployment mode is Mode C.

## Decision

No static data-generation pipeline is required for v1. Sample manifests and demo meshes may be committed as static frontend assets, but user jobs are created at runtime through the backend API.

## Consequences

There is no `make data` implementation beyond a no-op target documenting that Mode B is not active. Runtime artifacts live under the backend data directory and are not committed.

## Alternatives considered

- Treating uploaded job outputs as static release data: rejected because user jobs are runtime state.

