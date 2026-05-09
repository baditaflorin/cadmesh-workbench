# 0066 Error Handling Convention

## Status

Accepted.

## Context

Users need actionable browser errors; Go already has response helpers and utility error logging.

## Decision

Frontend boundary errors use domain-language toast messages and keep prior state intact. Backend errors keep JSON `error` responses. Helper functions return `Result`-style values only where recoverability matters.

## Consequences

CORS, clipboard, import, and backend-check failures show a what/why/next-step message rather than raw stack text.

## Alternatives Considered

- Throw through ErrorBoundary for all failures: rejected because recoverable user-input failures are not fatal app errors.
