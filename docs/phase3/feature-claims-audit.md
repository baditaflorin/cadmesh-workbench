# Phase 3 Feature Claims Audit

Date: 2026-05-09

| Claim source | Claim                                                                                        | Baseline status | Phase 3 action                                                                              |
| ------------ | -------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| README       | Browser-first CAD, mesh repair, and photogrammetry-to-glTF workbench with Docker compute API | Partial         | Keep, but limitations must clarify native compute is preview-only until adapters are wired. |
| README       | Source Inspector auto-detects STEP/STL/PLY/OBJ/OFF/glTF/GLB/photo manifests                  | Shipped         | Add non-file inputs and state export/import.                                                |
| README       | Browser mesh repair and decimation worker with GLB export                                    | Partial         | Fix real imported mesh handoff to repair/decimate.                                          |
| README       | Photo upload submits jobs to Docker backend                                                  | Shipped         | Keep result-mode warnings.                                                                  |
| README       | Backend detects native tools                                                                 | Shipped         | Keep.                                                                                       |
| README       | Pages UI shows version and commit                                                            | Shipped         | Keep.                                                                                       |
| ADR 0048     | Deterministic diagnostics                                                                    | Shipped         | Keep fixture coverage.                                                                      |
| ADR 0050     | Session-scoped learning/preferences                                                          | Partial         | Add versioned persisted session/settings, restore, clear.                                   |
| In-app       | Mesh Repair                                                                                  | Partial         | Make it operate on imported mesh.                                                           |
| In-app       | Export GLB                                                                                   | Shipped         | Keep.                                                                                       |

Mismatches found: 3 partial claims. All are Phase 3 priority items.
