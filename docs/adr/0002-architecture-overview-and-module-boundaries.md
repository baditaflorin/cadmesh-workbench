# 0002 Architecture overview and module boundaries

## Status

Accepted

## Context

The project combines interactive CAD/mesh UX, static hosting, backend job orchestration, native command adapters, and deployment assets. Boundaries must keep the frontend portable and the backend replaceable.

## Decision

Split the system into these modules:

- `frontend/`: TypeScript, React, Vite, static UI, 3D viewer, client storage, API client.
- `api/`: OpenAPI contract consumed by the frontend.
- `cmd/server/`: Go runtime API entrypoint.
- `internal/httpapi/`: handlers, middleware, health, metrics, OpenAPI serving.
- `internal/jobs/`: job repository, queue, workers, artifact management, native tool adapters.
- `internal/config/`: environment parsing.
- `internal/utils/`: shared error logging helper required by project convention.
- `deploy/`: Docker Compose, nginx, Prometheus, operational docs.
- `docs/`: GitHub Pages publish directory and project documentation.

## Consequences

Frontend code never shells out to native tools. Backend code owns job execution and file system state. The OpenAPI spec is the contract between them.

## Alternatives considered

- Monorepo with one flat `src/`: rejected because it blurs runtime boundaries.
- Backend serving frontend assets: rejected because Pages is the required public frontend surface.

