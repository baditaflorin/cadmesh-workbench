# 0015 Deployment topology

## Status

Accepted

## Context

Mode C requires Pages for frontend and Docker Compose plus nginx for the backend.

## Decision

Deploy as:

- Frontend: GitHub Pages at https://baditaflorin.github.io/cadmesh-workbench/
- Backend: GHCR image `ghcr.io/baditaflorin/cadmesh-workbench:<tag>`
- Server: Docker Compose with `app`, `nginx`, and optional `prometheus`
- Public host port: `25342`
- Internal app port: `8080`

Nginx terminates TLS, proxies `/api/`, blocks public `/metrics`, and sets security/CORS headers for the Pages origin.

## Consequences

The API and frontend can be deployed independently. The backend image does not serve frontend assets.

## Alternatives considered

- Single server serving everything: rejected because Pages is required.
- Exposing Go directly on the public port: rejected because nginx owns TLS and rate limiting.

