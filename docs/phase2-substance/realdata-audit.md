# Phase 2 Substance Real-Data Audit

Date: 2026-05-08

Scope: v1 `cadmesh-workbench` as published at https://baditaflorin.github.io/cadmesh-workbench/

Current happy path tested against the audit set:

- CAD tab: configure synthetic primitive and boolean preview.
- Mesh tab: load built-in sample mesh, repair, decimate, export GLB.
- Photos tab: select images and queue a backend job; backend emits deterministic preview artifacts unless native tooling is present.

No Phase 2 ADRs, picklist, fixtures, or code were generated for this audit.

## Real-World Inputs

| #   | Input                                                                                                                        | Class                                   | Source                                                                                       | Current v1 behavior                                                                                                                                                                                        | Expected behavior                                                                                                                                                | Failure mode                                                                                     | Manual work forced on user                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1   | McMaster-Carr production CAD model, e.g. a screw bracket STEP/Parasolid part                                                 | Clean CAD B-rep                         | https://www.mcmaster.com/cad-models                                                          | The app has no CAD file import. User can only approximate with box/cylinder/sphere controls.                                                                                                               | Detect STEP/Parasolid, read units, components, names, colors, bounding box, and offer a first boolean/mesh conversion plan.                                      | Obvious: no import path, but no domain explanation.                                              | Recreate dimensions and topology manually.                              |
| 2   | File Examples sample STEP mechanical assembly, 3.5 MB                                                                        | Mildly messy CAD assembly               | https://www.fileexamples.net/category/cad/cad-step-1                                         | Same as #1; no STEP import, no assembly tree, no unit inference.                                                                                                                                           | Import assembly, preserve part hierarchy, infer units, show components and tessellation confidence.                                                              | Obvious missing capability.                                                                      | Split/inspect assembly in FreeCAD before using the app.                 |
| 3   | 3DBenchy STL, 10.76 MB                                                                                                       | Clean but nontrivial print mesh         | https://commons.wikimedia.org/wiki/File%3A3DBenchy.stl                                       | Mesh tab cannot load the STL. Repair/decimate operates on a built-in cube-like sample.                                                                                                                     | Sniff STL, compute triangles/components/bounds, detect printability issues, suggest repair/decimation defaults.                                                  | Obvious, but misleading surface: "Mesh Repair" does not repair the user's mesh.                  | Use MeshLab/Blender first, then mentally transfer settings.             |
| 4   | Thingi10K real-world STL corpus; includes non-solid, self-intersecting, non-manifold, degenerate, open, and truncated models | Genuinely messy/broken/adversarial mesh | https://github.com/Thingi10K/Thingi10K                                                       | No STL ingestion. A broken STL cannot be localized to a line/facet; no explanation is possible.                                                                                                            | Parse robustly, classify corruption vs topology defects, expose confidence, propose skip/repair/stop decisions.                                                  | Obvious at UI level; would be wrong-but-confident if a user used the sample workflow as a proxy. | Identify file damage and repair strategy in external tools.             |
| 5   | Stanford Bunny PLY with scan holes                                                                                           | Real scan mesh with holes               | https://graphics.stanford.edu/data/3Dscanrep/                                                | No PLY import. Mesh repair cannot inspect boundary loops, holes, normals, or scan metadata.                                                                                                                | Read PLY, detect holes/open boundaries, estimate repair confidence, preserve scan provenance.                                                                    | Obvious missing input support.                                                                   | Convert PLY externally and guess whether repair changed the model.      |
| 6   | Smithsonian Apollo 11 Command Module 3D model                                                                                | Huge textured cultural-heritage mesh    | https://www.si.edu/object/3d/command-module-apollo-11%3Ad8c63e8a-4ebc-11ea-b77f-2e728ce88125 | No OBJ/glTF upload path. No streaming, texture handling, or size warning.                                                                                                                                  | Detect large textured asset, stream metadata first, preserve materials/textures, recommend decimation budget before loading full geometry.                       | Obvious for import; performance cliff is invisible until attempted elsewhere.                    | Downsample externally and risk losing textures/materials.               |
| 7   | ModelNet40 OFF CAD mesh objects                                                                                              | Edge-case CAD mesh format               | https://github.com/datasets-mila/datasets--modelnet40                                        | OFF is unsupported and not detected. User receives no "convert with X" path.                                                                                                                               | Sniff OFF, explain unsupported/convertible status, suggest conversion to OBJ/STL or run backend converter when available.                                        | Obvious but unhelpful.                                                                           | Learn the format issue and convert manually.                            |
| 8   | COLMAP South Building, 128 unordered images                                                                                  | Clean photogrammetry set                | https://colmap.org/ and https://colmap.readthedocs.io/en/latest/datasets.html                | Photos can be selected and queued, but the backend produces a deterministic preview glTF/report unless native tools are present. UI does not make the "not a reconstruction" distinction prominent enough. | Detect photo set, validate EXIF/resolution/overlap assumptions, refuse reconstruction if COLMAP/OpenMVS are unavailable, or run the real pipeline with progress. | Wrong-but-confident risk: a queued job can look like success while producing a placeholder.      | Know to check backend tools and understand COLMAP/OpenMVS availability. |
| 9   | ETH3D high-res multi-view set, e.g. indoor "old computer" or distorted JPG bundles                                           | Huge/messy photogrammetry set           | https://eth3d.ethz.ch/datasets                                                               | File picker accepts images, but there is no size budget, upload estimate, cancellation story, or quality preflight. Backend request limit is not explained in the UI.                                      | Preflight image count, total bytes, dimensions, EXIF/orientation, duplicates/blur; estimate runtime and make upload/job cancellable.                             | Hidden until late; user can wait before learning the job is too large or unsuitable.             | Manually curate/downscale photos and guess runtime.                     |
| 10  | Empty or partial phone-photo folder, e.g. cloud sync placeholder folder or only 2 usable images                              | Broken/partial real user input          | Common phone/iCloud/Google Photos export scenario                                            | Queue button is disabled for zero files, but the app does not explain minimum viable image count. With too few images, backend can still accept a preview-like job.                                        | Explain "need enough overlapping photos," identify partial set, list missing requirements, and offer preview-only mode honestly.                                 | Silent/unclear for empty; wrong-but-confident risk for too-few images.                           | Know photogrammetry minimums and decide whether the set is recoverable. |

## Top 5 Logic Gaps

1. **The app does not ingest the real CAD/mesh files its surface implies it works on.** STEP, STL, OBJ/glTF, PLY, and OFF inputs are not classified, parsed, validated, or routed.
2. **Photogrammetry success is not truth-preserving.** A backend job can complete with deterministic preview artifacts even when COLMAP/OpenMVS/Open3D/Draco are missing, which risks a successful-looking non-result.
3. **There is no domain diagnostic layer.** The app does not compute units, components, triangle count, manifoldness, holes, self-intersections, texture dependencies, EXIF/orientation, overlap, or photo-set sufficiency.
4. **Scale and failure are not modeled before work starts.** Huge meshes/photo sets have no preflight size budget, runtime estimate, progress, cancellation, or memory cliff warning.
5. **Exports lack real-input provenance and confidence.** GLB export reflects the current preview scene, not necessarily the user's source data, repair decisions, confidence, or reproducibility metadata.

## Top 3 Intuition Failures

1. **"Mesh Repair" does not repair the user's mesh.** The label promises domain work, but the flow starts from a built-in sample.
2. **"Queued photo job" can feel like "reconstruction started" even when native reconstruction is unavailable.** The UI does not force the distinction between preview and real photogrammetry.
3. **Export feels disconnected from input.** A user expects export to represent the imported/repaired/reconstructed asset; v1 exports the visible preview scene without enough provenance.

## Top 3 "Feels Stupid" Moments

1. The user must know whether an input belongs in CAD, Mesh, or Photos. The app should sniff format and route it.
2. The user must know which backend native tools are installed and what that means. The app should convert tool availability into domain outcomes.
3. The user must choose repair/decimation/reconstruction settings before seeing source diagnostics. The app should inspect first and propose defaults.

## What "Smart" Means For This Product

1. Dropping a STEP, STL, OBJ/glTF, PLY/OFF, or photo folder produces an immediate classified preview or an actionable domain error.
2. The app computes a first diagnostic pass automatically: units, bounds, components, triangle count, topology defects, texture dependencies, photo count, EXIF/orientation, and likely reconstruction viability.
3. Every inferred operation has confidence: repair plan, decimation ratio, boolean/tessellation readiness, and photogrammetry viability.
4. The app refuses to present placeholders as completed domain output. Preview-only outputs are labeled preview-only in UI and artifact metadata.
5. Every exported artifact includes provenance: source identifier, source checksums, app version, commit, schema version, parameters, confidence, and generation mode.

## Phase 2 Substance Success Metrics

1. **Real-data pass rate:** at least 7 of the 10 audit inputs complete the primary flow with no manual intervention beyond selecting/uploading the input.
2. **No crashes:** all 10 real inputs plus the 5 synthetic edge cases from §2A produce either a useful output or an actionable domain error.
3. **No silent wrongness:** 100% of preview-only, low-confidence, unsupported, or native-tool-missing cases are explicitly labeled in UI and export metadata.
4. **Determinism:** normalized diagnostics and export manifests are byte-identical across two runs for all 10 fixtures.
5. **Preflight latency:** for inputs up to 15 MB, median time from input selection to useful diagnostic preview is under 1 second; p95 under 2 seconds.
6. **Large-input honesty:** inputs above the v2 size budget show an estimate or warning within 300 ms and never freeze the UI thread for more than 100 ms.
7. **Cancellation:** any operation expected to exceed 5 seconds is cancellable, and cancellation leaves the previous coherent state intact.
8. **Error quality:** every boundary error states what failed, why in CAD/mesh/photogrammetry terms, and the next step.

## Out Of Scope For Phase 2 Substance

- New product surfaces, new tabs, new landing pages, or visual polish.
- Dark mode, command palette, onboarding tours, OG images, animation polish, or styling redesign.
- Changing deployment mode; Phase 2 remains Mode C.
- Accounts, collaboration, cloud project sync, or auth.
- Replacing FreeCAD, Blender, MeshLab, COLMAP, OpenMVS, or Open3D wholesale.
- Adding unrelated domains outside the existing CAD, mesh repair/decimation/boolean, and photogrammetry-to-glTF flows.
- Native packaging work that changes deployment topology before the audit-derived plan is confirmed.
