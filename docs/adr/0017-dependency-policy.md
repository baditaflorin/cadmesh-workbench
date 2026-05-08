# 0017 Dependency policy

## Status

Accepted

## Context

The domain is complex. Custom CAD kernels, mesh serializers, HTTP routers, and metrics systems would add risk.

## Decision

Use production-ready libraries:

- Backend: `chi`, `prometheus/client_golang`, `go-playground/validator`, stdlib `slog`.
- Frontend: `vite`, `react`, `tailwindcss`, `zod`, `@tanstack/react-query`, `three`, `comlink`, `idb`.
- Tests: Go `testing`, `testify`, Vitest, Playwright.

Prefer existing native binaries for COLMAP/OpenMVS/Open3D/Draco adapters. Keep custom code focused on orchestration, UI, contracts, and small deterministic browser mesh transforms.

## Consequences

Dependency updates must be reviewed intentionally. Large libraries are lazy-loaded where possible.

## Alternatives considered

- Bespoke CAD or photogrammetry implementations: rejected as unsafe and unrealistic for v1.
