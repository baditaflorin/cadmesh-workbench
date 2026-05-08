# 0008 Go backend project layout

## Status

Accepted

## Context

The backend needs a clear Go layout that supports a server now and additional CLI tools later.

## Decision

Follow the common Go project layout:

- `cmd/server/` for the runtime API.
- `internal/` for application packages.
- `pkg/contracts/` for generated or shared public data structures.
- `api/` for OpenAPI.
- `configs/` for sample config if needed.
- `scripts/` for local automation.
- `test/` for integration and e2e tests.

## Consequences

Internal packages cannot be imported externally. Additional CLIs can be added without reshaping the server package.

## Alternatives considered

- Single `main.go`: rejected because job orchestration and HTTP concerns would become tangled.

