# 0004 API contract

## Status

Accepted

## Context

Mode C requires a stable frontend-to-backend contract. The frontend should not hand-write assumptions about request and response shapes.

## Decision

Use REST/JSON with an OpenAPI 3.1 contract at `api/openapi.yaml`.

The backend serves health endpoints, metrics, and job endpoints:

- `GET /healthz`
- `GET /readyz`
- `GET /metrics`
- `GET /api/v1/tools`
- `POST /api/v1/jobs`
- `GET /api/v1/jobs`
- `GET /api/v1/jobs/{id}`
- `GET /api/v1/jobs/{id}/artifacts/{artifact}`

The frontend uses generated or contract-shaped TypeScript types derived from the OpenAPI schemas.

## Consequences

The API can evolve with explicit versioning. Backend and frontend tests can validate against the same document.

## Alternatives considered

- GraphQL: rejected because the domain is job-oriented and REST fits artifact downloads better.
- Hand-written ad hoc JSON: rejected because v1 needs a documented contract.
