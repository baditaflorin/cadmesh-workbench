# 0044 Confidence model

## Status

Accepted

## Context

No silent wrongness is possible only if uncertainty is explicit.

## Decision

Use confidence values from 0 to 1 for classification, route, repair plan, decimation plan, and photo viability. Confidence is derived from evidence quality:

- Magic/header match.
- Count consistency.
- Parsed geometry completeness.
- Topology anomaly rate.
- Required sibling/native dependencies.
- Photo set sufficiency.

Confidence below 0.7 is labeled as "verify" in the UI and export metadata.

## Consequences

The app can make a first guess without pretending certainty.

## Alternatives considered

- Boolean pass/fail only: rejected because it hides uncertainty.
