# 0006 WASM modules used and why

## Status

Accepted

## Context

Browser-side mesh and CAD work should avoid a backend round-trip when a safe, bounded operation can run locally. GitHub Pages cannot set arbitrary COOP/COEP headers, so WASM choices must not rely on SharedArrayBuffer unless a service-worker isolation strategy is added later.

## Decision

Use lazy browser modules for bounded local work:

- Three.js for rendering and GLB export.
- Draco decoder/encoder support where bundle size permits, lazy-loaded only during compression/export.
- Client mesh repair and simplification start with deterministic TypeScript workers, with future replacement by Open3D/meshoptimizer/libigl WASM adapters behind the same worker contract.

Native OCCT, COLMAP, OpenMVS, and large Open3D workflows remain backend concerns for v1.

## Consequences

The first load stays small. WASM and viewer code are only loaded after the user opens the workbench or export flow. Future WASM replacements can keep the UI contract stable.

## Alternatives considered

- Eagerly loading CAD/photogrammetry WASM: rejected for payload size and Pages header limitations.
- Browser-only COLMAP/OpenMVS: rejected for v1 reliability.
