# 0012 Metrics and observability

## Status

Accepted

## Context

The backend needs health and basic performance visibility. The frontend should avoid analytics by default.

## Decision

Expose Prometheus metrics at `/metrics`:

- HTTP request count, latency, and in-flight requests.
- Job submissions by workflow.
- Job completions by workflow and status.
- Job duration histogram.
- Native tool availability gauge.

Do not add client analytics in v1.

## Consequences

Operators can scrape the backend. The Pages frontend collects no PII and sends no analytics beacons.

## Alternatives considered

- Plausible or beacon analytics: rejected for v1 because usage insight is not required.
