# Phase 2 Substance Postmortem

Date: 2026-05-09

Live app: https://baditaflorin.github.io/cadmesh-workbench/

Repository: https://github.com/baditaflorin/cadmesh-workbench

## Real-Data Pass Rate

| Fixture                    | Before                                  | After | Evidence                                                 |
| -------------------------- | --------------------------------------- | ----- | -------------------------------------------------------- |
| 01-mcmaster-step           | Fail: no import                         | Pass  | STEP classified, units/schema/components inferred        |
| 02-step-assembly           | Fail: no import                         | Pass  | AP242 assembly classified, BOM/CRLF normalized           |
| 03-3dbenchy-stl            | Fail: sample-only mesh flow             | Pass  | ASCII STL triangles/bounds inferred and routed to Mesh   |
| 04-thingi10k-truncated-stl | Fail: no corruption handling            | Pass  | Recoverable truncated STL warning and re-export guidance |
| 05-stanford-bunny-ply      | Fail: no PLY import                     | Pass  | PLY vertices/faces parsed, boundary anomaly surfaced     |
| 06-smithsonian-obj         | Fail: no OBJ dependency handling        | Pass  | OBJ faces/textures detected, material dependency warning |
| 07-modelnet40-off          | Fail: unsupported with no path          | Pass  | OFF recognized as convertible mesh exchange format       |
| 08-colmap-south-building   | Partial: queued preview could look real | Pass  | Photo set preflight plus native-required labeling        |
| 09-eth3d-highres           | Fail: no large-set honesty              | Pass  | Large set and EXIF orientation warnings                  |
| 10-partial-phone-photos    | Fail: too-few photos unclear            | Pass  | Recoverable too-few/placeholder diagnostics              |

Baseline: 0/10 useful first diagnostics.

After Phase 2: 10/10 useful first diagnostics, 10/10 deterministic manifests, 10/10 explicit confidence/result-mode labeling.

## Logic Gaps Closed

1. Real CAD/mesh ingestion: added a Source Inspector that sniffs STEP/STL/PLY/OBJ/OFF/glTF/GLB/photo manifests and routes to CAD, Mesh, Photos, or Review.
2. Photogrammetry truthfulness: backend jobs now expose `result_mode`, warnings, and preview-only provenance when native tools are missing or not executed.
3. Domain diagnostics: diagnostics now include units, schema, components, triangle/face/vertex counts, bounds, texture dependencies, photo counts, EXIF orientation, and topology anomalies.
4. Scale/failure modeling: browser budgets, large-photo warnings, recoverable/fatal states, cancel/reset, and last-input-wins concurrency are explicit.
5. Provenance/confidence: diagnostic manifests and backend reports include source IDs, checksums, schema version, app version, commit, parameters, confidence, and generation mode.

## Smart Behaviors

- Selecting a CAD, mesh, or photo-set manifest immediately produces a classified first guess without requiring the user to choose a tab first.
- Messy inputs degrade into domain-language recoverable states instead of generic parser errors.
- The UI surfaces confidence, anomalies, suggested next steps, activity history, and `?debug=1` manifests.
- Backend preview artifacts are not presented as native reconstructions; the job record and report artifact say `preview-only`.

## Determinism

Every fixture passed the repeated-run `stableJSON` check in `frontend/src/features/intelligence/analyzer.fixtures.test.ts`.

| Fixture                    | Determinism |
| -------------------------- | ----------- |
| 01-mcmaster-step           | Pass        |
| 02-step-assembly           | Pass        |
| 03-3dbenchy-stl            | Pass        |
| 04-thingi10k-truncated-stl | Pass        |
| 05-stanford-bunny-ply      | Pass        |
| 06-smithsonian-obj         | Pass        |
| 07-modelnet40-off          | Pass        |
| 08-colmap-south-building   | Pass        |
| 09-eth3d-highres           | Pass        |
| 10-partial-phone-photos    | Pass        |

## Performance

Measured with:

`npm test -- --reporter=verbose frontend/src/features/intelligence/analyzer.fixtures.test.ts`

Median preflight: 2 ms.

p95 preflight: 9 ms.

Worst fixture: 9 ms on truncated STL recovery.

The fixture suite uses committed excerpts/manifests, so it validates logic latency and determinism. Full native reconstruction throughput remains outside this Phase 2 substance pass.

## Surprises

- The most valuable improvement was not a bigger renderer; it was making preview-only and low-confidence states impossible to miss.
- The real-data fixture discipline made the product language better. "Truncated STL" and "cloud placeholder" are immediately more useful than generic import failure text.
- Local Go tests must use the repo's configured `CGO_ENABLED=0` path on this machine because default dynamic linking found an unrelated ONNX runtime dependency.

## Still Open

1. Native OCCT/COLMAP/OpenMVS/Open3D/Draco execution adapters that replace preview-only backend artifacts with real outputs.
2. Streaming parsers for very large STL/OBJ/PLY files instead of header/sample preflight.
3. Real image EXIF/blur/overlap analysis for uploaded photos, not just manifest and header-level checks.
4. User correction learning for inferred field/route decisions beyond session activity and saved backend URL.
5. Export/re-import of the diagnostic manifest as a canonical project state file.

## Honest Take

The app no longer feels like a toy at the first contact point: it accepts the kinds of files users actually bring, makes a useful first guess, explains confidence and anomalies, and refuses to silently dress previews as finished native work.

It still feels thin at the deepest compute layer because native CAD booleans, mesh repair, and photogrammetry reconstruction are not executed by the backend yet. The difference now is honesty: the workbench says exactly when it is giving a diagnostic/preview and what native step is required next.
