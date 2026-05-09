# Phase 3 Controls Audit

Date: 2026-05-09

| Control                                  | Baseline | Finding                                                                          | Decision                                                     |
| ---------------------------------------- | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Source Inspector file input              | Green    | Real file diagnostics work.                                                      | Keep.                                                        |
| Source Inspector Cancel                  | Yellow   | Cancels stale results but only during active worker analysis.                    | Keep and document as last-input-wins cancellation.           |
| Source Inspector Reset                   | Yellow   | Clears panel state but not persisted state.                                      | Finish by clearing persisted session.                        |
| CAD primitive/boolean/dimension controls | Green    | Update visible CAD preview.                                                      | Keep.                                                        |
| CAD Preview                              | Yellow   | Recomputes summary; label under-explains it is browser preview.                  | Rename/clarify to preview-only in docs/UI where needed.      |
| CAD Queue                                | Yellow   | Queues backend preview job, not native CAD yet.                                  | Keep but result mode is preview-only; docs already say this. |
| Mesh Sample                              | Green    | Loads sample mesh.                                                               | Keep as demo path.                                           |
| Mesh Repair                              | Red      | After real STL import, button repaired built-in sample instead of imported mesh. | Fix by wiring imported scene mesh into MeshPanel.            |
| Mesh Decimate                            | Red      | Same imported-mesh wiring bug as Repair.                                         | Fix.                                                         |
| Photo file input                         | Green    | Queues selected photos.                                                          | Keep.                                                        |
| Photo Preview                            | Green    | Shows photo-set preview mesh.                                                    | Keep.                                                        |
| Photo Queue                              | Yellow   | Queues preview-only backend unless native tools are installed.                   | Keep with warning/result mode.                               |
| Backend API URL                          | Green    | Persists to IndexedDB.                                                           | Keep.                                                        |
| Backend Check                            | Yellow   | Fetches tools/jobs but failures are only query state.                            | Add user-facing error toast.                                 |
| Viewport Reset                           | Green    | Resets scene.                                                                    | Keep.                                                        |
| Viewport Export GLB                      | Green    | Downloads visible scene.                                                         | Keep.                                                        |
| Repo/Star link                           | Green    | Opens repository.                                                                | Keep.                                                        |
| PayPal support link                      | Green    | Opens PayPal.                                                                    | Keep.                                                        |

Baseline counts: green 10, yellow 6, red 2.

Target counts after Phase 3: green 18.
