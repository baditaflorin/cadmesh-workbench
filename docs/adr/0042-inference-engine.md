# 0042 Inference engine

## Status

Accepted

## Context

Users should not have to know whether a file is CAD, mesh, or photogrammetry input before the app can help.

## Decision

Run a client-side worker that infers:

- Format: STEP, STL ASCII/binary, PLY, OBJ, glTF/GLB, OFF, image set, fixture manifest, unknown.
- Domain: CAD, mesh, photo set, unsupported, broken.
- Route: CAD, Mesh, Photos, or Review.
- Basic diagnostics: counts, bounds, units, components, texture dependencies, image dimensions, duplicates, topology hints.

The worker returns a deterministic diagnostic manifest and optional preview mesh.

## Consequences

The UI can switch to the likely workflow and show a useful first guess immediately. Heavy parsing stays off the main thread.

## Alternatives considered

- Backend-only inference: rejected because GitHub Pages should feel useful before a backend is configured.
