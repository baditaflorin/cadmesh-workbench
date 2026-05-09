# Phase 3 Input Pathway Audit

Date: 2026-05-09

Status key: green = works end-to-end, yellow = partial, red = claimed or expected but blocks real use, gray = deliberately out of scope.

| Entry point                | Baseline | Finding                                                                               | Target                                                                                  |
| -------------------------- | -------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| CAD/mesh/photo file picker | Green    | Source Inspector accepts STEP/STL/PLY/OBJ/OFF/glTF/GLB/images/manifests.              | Keep green with tests.                                                                  |
| Drag and drop              | Red      | Users naturally drag real CAD/mesh files onto the workbench; no drop target existed.  | Add drop target to Source Inspector.                                                    |
| Paste text/HTML            | Red      | A user with copied STEP/STL/OBJ text had to create a file first.                      | Add paste box and clipboard paste handling.                                             |
| Clipboard image            | Yellow   | Browser paste events can expose image files, but no UI path handled them.             | Accept image files from paste.                                                          |
| URL input                  | Red      | No URL entry point. Browser CORS prevents many CAD URLs; app should be honest.        | Add URL input with fetch when CORS allows and explicit paste guidance when it does not. |
| Multi-file photo set       | Green    | Image sets route to Photos and report sufficiency.                                    | Keep green.                                                                             |
| Mixed CAD/mesh multi-file  | Green    | Produces recoverable mixed-source diagnostic.                                         | Keep green.                                                                             |
| Folder picker              | Gray     | Browser directory upload is inconsistent and not needed for v3 once multi-file works. | Document out of scope.                                                                  |
| Mobile picker              | Yellow   | File input works, but camera/share-sheet expectations were not documented.            | Keep accept list broad and document limits.                                             |
| Sample/demo                | Yellow   | Mesh sample exists, but Source Inspector has no sample equal to user data path.       | Add Source Inspector sample loaders.                                                    |
| Imported state             | Red      | Diagnostic JSON could be viewed in debug mode but not re-imported.                    | Add state-file import.                                                                  |
| Restored autosave          | Red      | API URL persisted, but diagnostic/session state did not.                              | Add versioned local session restore and clear state.                                    |

Baseline counts: green 3, yellow 3, red 5, gray 1.

Target counts after Phase 3: green 10, gray 2.
