# Postmortem

## Built

- Public repository: https://github.com/baditaflorin/cadmesh-workbench
- GitHub Pages frontend: https://baditaflorin.github.io/cadmesh-workbench/
- React/Vite/TypeScript UI with CAD, mesh, and photo workflows.
- Three.js viewport with GLB export, desktop/mobile smoke coverage, and canvas screenshot checks.
- Go backend with OpenAPI, job queue, artifact storage, health/readiness, Prometheus metrics, CORS, and Docker deployment assets.
- Local hooks, Makefile targets, ADRs, deploy docs, and security baseline.

## Mode Choice In Hindsight

Mode C was still the right call for the requested product because user-supplied photogrammetry and native CAD/mesh jobs need runtime compute, disk, and native binaries.

The browser workbench portion could have stayed Mode A for v1, and it does degrade that way when no backend is running. The photogrammetry-to-glTF requirement is the deciding factor that keeps the full project in Mode C.

## What Worked

- GitHub Pages from `main`/`docs` worked on day one.
- The frontend stayed static and exposes repository, support, version, and commit metadata directly in the app.
- OpenAPI became the frontend/backend contract through generated TypeScript types.
- The backend can accept JSON jobs and multipart photo uploads, persist state, produce preview glTF/report artifacts, and expose operational metrics.

## What Did Not Work

- The first Vite build wiped documentation because `docs/` is both the Pages publish directory and documentation directory. The build now cleans only generated Pages assets.
- Full native COLMAP/OpenMVS/OpenCascade execution is adapter-ready but not bundled into the distroless backend image. That keeps the image small, but a production photogrammetry deployment still needs native tool packaging or sidecar workers.

## Surprises

- Local Go tests needed `CGO_ENABLED=0` in this environment because the default dynamic linker looked for an unrelated ONNX runtime library.
- The latest Vite/Rolldown type surface required a function-style `manualChunks` config.

## Accepted Tech Debt

- The browser mesh repair and decimation are deterministic v1 implementations, not libigl/Open3D-grade replacements.
- The backend produces preview glTF artifacts unless native tool execution is added to the deployment image.
- The Pages build commits generated assets into `docs/`, which is intentionally noisy because GitHub Actions are out of scope.

## Next Improvements

1. Add a native worker image that packages COLMAP, OpenMVS, Open3D, Draco, and OCCT with job-level resource limits.
2. Replace the TypeScript mesh transforms with Open3D/libigl/meshoptimizer WASM behind the existing worker API.
3. Add resumable chunked uploads and job cancellation for large photo sets.

## Time Spent Vs Estimate

Estimated v1 bootstrap: 6-8 hours.

Actual implementation pass: one extended scaffolding session. The remaining work is native tool packaging and deeper CAD kernel integration.
