# Phase 3 Findings Synthesis

Date: 2026-05-09

## Top 5 Usability Gaps

1. Imported meshes were not connected to Mesh Repair/Decimate controls.
2. Diagnostics could not be exported, copied, shared, printed, or restored without debug mode.
3. Users could not paste/drop/URL-load data, even though those are natural browser workflows.
4. Last-session state was not restored, so reload lost the user's real-data context.
5. Backend failures from Check were not explained as user-facing errors.

## Top 5 Half-Baked Features

1. Mesh Repair on imported data: finish.
2. Diagnostic debug manifest as a hidden output: finish as download/copy/state/share.
3. Backend Check: finish with actionable failure toast and copyable curl.
4. URL input: finish as CORS-aware fetch with honest fallback.
5. Session memory: finish with versioned restore/clear settings.

## Top 5 Codebase Pain Points

1. Source Inspector doing input, analysis, state, export, and activity all in one file.
2. Unsafe multipart OpenAPI casts.
3. No canonical persisted-state schema.
4. Mesh panel state isolated from imported scene state.
5. No tests around browser input/output completeness.

## Top 5 Documentation/Reality Mismatches

1. Mesh Repair claim implied imported mesh repair; baseline repaired the sample.
2. Browser-first implied browser input ergonomics; drag/drop/paste/URL were absent.
3. Debug manifest existed but was not a user output pathway.
4. Session preferences existed only for API URL, not user work.
5. Backend compute was correctly labeled preview-only in Phase 2, but README needed clearer limitations.

## Fully Usable Means

- A stranger can drag, paste, select, or URL-load their own STEP/STL/PLY/OBJ/OFF/glTF/photo manifest and get a useful diagnostic.
- If the data is a mesh, Repair and Decimate operate on that imported mesh, not on a sample.
- The user can download/copy/share/print diagnostics and export/re-import a state file.
- Reloading the page restores the last useful workbench state unless the user has disabled restore or cleared state.
- Every limitation uses domain language and provides a next step.

## Success Metrics

- Input audit: 10 green, 2 gray.
- Output audit: 7 green, 2 gray.
- Controls audit: 18 green.
- Phase 2 fixtures: 10/10 still pass, deterministic.
- TypeScript unsafe casts: 0 outside named boundary helper functions.
- Stranger test: top 3 issues fixed before release.

## Out Of Scope

- Native engine changes to OCCT/COLMAP/OpenMVS/Open3D.
- Visual polish, dark mode, animation polish, onboarding tours.
- Accounts, cloud sync, auth, collaboration.
- New CAD/mesh algorithms beyond completing existing controls.
