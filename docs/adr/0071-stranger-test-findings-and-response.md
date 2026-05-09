# 0071 Stranger-Test Findings And Response

## Status

Accepted.

## Context

Phase 3 requires a cold-path stranger test.

## Decision

Use a private-browser cold run with a real STL fixture and a copied OBJ snippet. Fix the top three issues found before release: unclear drop affordance, missing state export, and imported mesh repair handoff.

## Consequences

The release is judged by unaided real-data flow rather than only unit tests.

## Alternatives Considered

- Skip because automated smoke exists: rejected because smoke does not capture confusion.
