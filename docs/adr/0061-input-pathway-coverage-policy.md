# 0061 Input Pathway Coverage Policy

## Status

Accepted.

## Context

Browser users expect file picker, drag/drop, paste, URL, sample, and restore pathways.

## Decision

Support file picker, drag/drop, paste text/image, URL fetch when CORS allows, sample loaders, and state import. Directory upload is out of scope for v3 because multi-file photo selection covers the core workflow and browser directory APIs are inconsistent.

## Consequences

Every supported pathway funnels through the same analyzer and uses the same diagnostics. URL failures must explain CORS and suggest paste/download fallback.

## Alternatives Considered

- Add a backend URL proxy: rejected because it would change deployment/runtime behavior.
