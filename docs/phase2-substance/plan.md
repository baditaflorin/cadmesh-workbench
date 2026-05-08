# Phase 2 Substance Plan

The implementation is ranked by user impact on the 10 real-data inputs from `realdata-audit.md`.

## Picklist

1. **A6 Auto-detect structure:** file/folder sniffer classifies CAD, mesh, photo set, unsupported, or broken.
2. **B8 Useful first guess on first input:** selecting files immediately runs preflight diagnostics.
3. **A2 Encoding and format variants:** normalize BOM, CRLF, CP1252-ish smart punctuation, NBSP, and malformed text headers.
4. **A4 Partial inputs:** truncated STEP/STL/PLY/OBJ/OFF and partial photo folders degrade to recoverable errors.
5. **A5 Adversarial input:** broken STL facet data, malformed counts, missing OBJ material files, and empty inputs are explicit.
6. **C13 Recognize common shapes:** STEP assembly, STL print mesh, scan PLY, textured OBJ, OFF CAD mesh, photo set.
7. **C11 Domain vocabulary:** UI and errors say "mesh is open" and "native reconstruction unavailable," not generic parser terms.
8. **C12 Domain-aware validation:** units, components, topology, texture dependencies, photo count, image size, duplicates.
9. **B9 Format normalization:** normalized units, line endings, counts, bounds, image dimensions, and route.
10. **D16 Confidence scores:** every classification, route, repair plan, and photo viability decision gets confidence.
11. **D18 Surface anomalies:** non-manifold edges, boundary edges, degenerate triangles, truncated payloads, missing textures.
12. **D17 Suggest fixes:** skip/convert/repair/downsample/install-native-tools guidance appears with failures.
13. **D19 Explain decisions:** debug surface exposes the reasoning for classification and confidence.
14. **E20 Pipelines, not screens:** inferred mesh/photo diagnostics can drive the existing preview scene and backend queue.
15. **E22 Stable IDs everywhere:** source IDs derive from normalized names, size, and deterministic checksums.
16. **E21 Lossless round-trip:** exportable diagnostic manifest becomes canonical state for re-import-style testing.
17. **F24 Enumerate reachable states:** state taxonomy documented and represented in UI state.
18. **F25 No stuck states:** every state has reset, retry, or inspect exits.
19. **F26 Cancellation:** stale analysis results are ignored and the UI returns to a coherent prior/cancelled state.
20. **F27 Concurrency safety:** repeated file selections and fast clicks are last-input-wins.
21. **G29 Heavy work off main thread:** diagnostics and mesh parsing run in a worker.
22. **G31 Cache expensive things:** identical input fingerprints reuse diagnostics during the session.
23. **G28 Profile real inputs:** fixture timing is recorded and summarized in `docs/perf/phase2-substance.md`.
24. **H32 Actionable errors:** every boundary error has what/why/now-what.
25. **H33 Validate at boundaries:** file and backend job requests validate before deep processing.
26. **H34 Recoverable vs fatal explicit:** recoverability is part of diagnostics, UI, and job reports.
27. **I35 Deterministic outputs:** fixture manifests are byte-identical across repeated analysis.
28. **I36 Inspectable history:** user-visible activity log records inputs and operation decisions.
29. **I37 Debug overlay:** `?debug=1` exposes internal diagnostics, confidence, timing, and state.
30. **I38 Output provenance:** diagnostics, backend reports, and exports carry source ID, checksums, schema, version, commit, parameters.
31. **J39 Remember corrections within session:** backend URL and last diagnostic route are cached; inference corrections are session scoped.

## Commit Strategy

The work is grouped into logical commits:

- `docs:` Phase 2 plan, fixtures, ADRs.
- `feat:` input intelligence engine and worker.
- `feat:` UI state machine, diagnostics, confidence, and debug surface.
- `fix:` backend truthfulness, provenance, and deterministic reports.
- `test:` real-data fixture, determinism, performance, and e2e updates.
- `docs:` postmortem and pass-rate evidence.
