# 0067 State Management Convention

## Status

Accepted.

## Context

The app has local UI state, persisted preferences, query cache, and worker results.

## Decision

Keep React local state for visible screen state, TanStack Query for backend reads, IndexedDB for preferences/session state, and URL hash only for explicit share links.

## Consequences

Reload restores last session without adding account sync.

## Alternatives Considered

- Redux/Zustand: rejected; the app state is small enough for local ownership.
