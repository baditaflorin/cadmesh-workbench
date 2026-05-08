# 0005 Client-side storage strategy

## Status

Accepted

## Context

The frontend needs local state for recent projects, preferred backend URL, saved parameter sets, and last successful responses. Large source files should not be persisted without user consent.

## Decision

Use IndexedDB for project metadata and generated lightweight mesh snapshots, OPFS when available for large local files, and `localStorage` only for simple preferences such as backend URL and selected theme.

## Consequences

- The app remains useful without accounts.
- No server is needed for cross-session local state.
- Cross-device sync is intentionally out of scope for v1.

## Alternatives considered

- Server-side persistence: rejected for v1 because it would require accounts, auth, and backup policy.
- `localStorage` for everything: rejected because CAD and mesh payloads exceed its practical limits.
