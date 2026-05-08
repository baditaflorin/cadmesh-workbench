# 0011 Logging strategy

## Status

Accepted

## Context

Mode C needs server logs suitable for Docker and operations. The frontend should not emit noisy production logs.

## Decision

The backend uses Go `slog` JSON logs to stdout with request IDs and job IDs where available. The frontend suppresses debug logs in production and surfaces user-facing errors through UI toasts and panels.

## Consequences

Docker log collectors can parse backend logs. Browser users are not asked to inspect the console for normal failures.

## Alternatives considered

- Text logs: rejected because JSON is easier to aggregate.
- Verbose browser console logging: rejected for production polish.
