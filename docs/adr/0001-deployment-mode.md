# 0001 Deployment mode

## Status

Accepted

## Context

The workbench needs a public browser UI, local-first model inspection, and heavyweight processing for user-supplied CAD, mesh, and photogrammetry inputs. GitHub Pages is the preferred public surface, but COLMAP/OpenMVS-style reconstruction and large native mesh jobs require native binaries, worker isolation, disk, and predictable CPU/RAM.

## Decision

Use Mode C: GitHub Pages frontend plus a Docker backend.

The frontend is a static GitHub Pages app published from `main` branch `/docs`. The backend is a Go API packaged as `ghcr.io/baditaflorin/cadmesh-workbench`, intended to run behind nginx on host port `25342`.

## Consequences

- Public discovery and demos work from GitHub Pages.
- Secrets never enter the frontend.
- User-uploaded compute jobs are handled by the backend.
- Docker deployment is required for full photogrammetry and native mesh pipelines.
- The frontend must degrade gracefully when no backend URL is configured.

## Alternatives considered

- Mode A, pure GitHub Pages: rejected because browser-only COLMAP/OpenMVS and large B-rep processing are not realistic for v1.
- Mode B, Pages plus pre-built data: rejected because users need to run new jobs on their own photos and models.

