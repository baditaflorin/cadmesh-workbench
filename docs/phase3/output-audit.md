# Phase 3 Output Pathway Audit

Date: 2026-05-09

| Exit point               | Baseline | Finding                                                            | Target                                    |
| ------------------------ | -------- | ------------------------------------------------------------------ | ----------------------------------------- |
| GLB download             | Green    | Viewport export downloads the visible scene.                       | Keep green with smoke coverage.           |
| Diagnostic JSON download | Red      | Debug manifest existed only inside `?debug=1`; no normal download. | Add download button.                      |
| Copy diagnostic JSON     | Red      | No copy pathway for support/debug downstream use.                  | Add clipboard copy with confirmation.     |
| Downloadable state file  | Red      | No full reloadable workbench state export.                         | Add `.cadmesh.json` state export/import.  |
| Share URL                | Red      | No shareable state, even for small diagnostics.                    | Add hash-encoded state with size guard.   |
| Print/PDF report         | Red      | Browser print included the full app chrome.                        | Add print report action and print CSS.    |
| API/curl-ready output    | Yellow   | API docs exist; UI exposes API URL but no copyable command.        | Add copy curl command for backend checks. |
| Screenshot               | Gray     | Canvas screenshots are test artifacts, not a v3 user claim.        | Out of scope.                             |
| Embed code               | Gray     | Not claimed and not useful for a CAD workbench v3.                 | Out of scope.                             |

Baseline counts: green 1, yellow 1, red 5, gray 2.

Target counts after Phase 3: green 7, gray 2.
