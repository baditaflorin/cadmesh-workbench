# 0043 Domain vocabulary and UI language conventions

## Status

Accepted

## Context

Generic parser errors make expert tools feel brittle and novice-hostile.

## Decision

Use CAD, mesh, and photogrammetry language:

- "STEP assembly," "unit," "component," "tessellation."
- "Triangle count," "boundary edges," "non-manifold edges," "degenerate faces."
- "Photo overlap," "EXIF orientation," "native reconstruction tools."

Every error follows what/why/now-what language.

## Consequences

Users understand failures in domain terms and can recover without reading stack traces.

## Alternatives considered

- Exposing raw exceptions: rejected.
