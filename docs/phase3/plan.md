# Phase 3 Completeness Plan

Ranked by real-user impact.

1. A1: Add drag/drop input to Source Inspector.
2. A6: Add paste/clipboard text and image input with fallback paste box.
3. A3: Add URL input with CORS-aware guidance.
4. A7: Add Source Inspector samples that use the same diagnostic path as user data.
5. A8/I38: Restore last diagnostic/session state on reload.
6. B11/I41: Download/import versioned `.cadmesh.json` state.
7. B10: Copy diagnostic JSON to clipboard.
8. B12: Generate shareable hash URL for small diagnostic states.
9. B13: Add print report action and print CSS.
10. B14: Add copyable backend curl command.
11. C16: Make Mesh Repair operate on imported mesh scene data.
12. C16: Make Mesh Decimate operate on imported mesh scene data.
13. C18: Add real Settings section for restore preference and clear state.
14. C19/J42: Update README claims and limitations.
15. D21/H35: Remove unsafe multipart OpenAPI casts.
16. D23/H36: Add persisted-state schema and migration.
17. E24: Extract state/import/export helpers from Source Inspector.
18. F28: Remove duplicated local file conversion by centralizing source input utilities.
19. G31: Make backend check errors actionable.
20. G33: Normalize control labels around preview-only/native-required output.
21. I39: Persist state with schema version and migration.
22. I40: Add clear-state operation.
23. K46: Run stranger test in fresh browser path.
24. K47: Fix top-3 stranger-test findings.

Commit grouping:

- `chore: phase 3 completeness audit`
- `docs: add phase 3 completeness ADRs`
- `feat: complete source input and state pathways`
- `feat: add diagnostic output and settings pathways`
- `fix: repair imported meshes end to end`
- `refactor: consolidate boundary helpers`
- `test: cover phase 3 usability paths`
- `docs: add phase 3 postmortem`
- `chore: publish phase 3 pages build`
