# 0041 Input robustness and normalization policy

## Status

Accepted

## Context

CAD and mesh files often arrive with mixed line endings, byte-order marks, partial transfers, legacy encodings, malformed counts, or sibling dependency gaps.

## Decision

Normalize at the boundary:

- Strip UTF-8 BOM.
- Normalize CRLF/CR to LF.
- Collapse NBSP into spaces.
- Normalize common CP1252 smart punctuation when decoded as text.
- Sniff binary formats before text parsing.
- Treat truncated files as recoverable unless the format cannot be identified.
- Preserve original bytes for checksum and provenance.

## Consequences

The app can classify many partial/broken inputs without crashing. Normalized diagnostics are deterministic.

## Alternatives considered

- Strict parser-only validation: rejected because it gives poor first-contact behavior for real-world messy data.
