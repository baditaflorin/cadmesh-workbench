# 0040 Real-data audit findings and substance success metrics

## Status

Accepted

## Context

The v1 workbench demos a CAD/mesh/photo workflow, but real user inputs expose gaps in file ingestion, domain diagnostics, truthfulness, and scale handling.

## Decision

Use the 10 real-data audit inputs as the Phase 2 grading rubric. A fixture is passing only when the app produces a useful first diagnostic or a domain-specific recoverable error without manual configuration.

Success targets:

- At least 7/10 fixtures pass the primary preflight flow.
- All fixtures are deterministic.
- No fixture produces silent wrongness.
- Inputs under 15 MB show useful diagnostics in under 1 second median on local test hardware.

## Consequences

Fixture behavior drives implementation priority. Any future regression in the fixture suite blocks release.

## Alternatives considered

- Adding more UI polish first: rejected because it would not improve real-data reliability.
