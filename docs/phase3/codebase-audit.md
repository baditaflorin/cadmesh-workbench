# Phase 3 Codebase Health Audit

Date: 2026-05-09

Commands:

`rg -n "TODO|FIXME|XXX|HACK|@ts-ignore|\\bany\\b| as unknown| as any|console\\.log|alert\\(" frontend/src internal cmd api README.md docs -g '!docs/assets/**'`

## Baseline Findings

| Category                 |     Count | Notes                                                                                                                                        |
| ------------------------ | --------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TODO/FIXME/XXX/HACK      |         0 | No tracked debt markers found.                                                                                                               |
| TypeScript `any`         |         0 | No TypeScript `any` found.                                                                                                                   |
| `@ts-ignore`             |         0 | None.                                                                                                                                        |
| Unsafe TypeScript casts  |         2 | Multipart OpenAPI call used `as unknown as ...` in `frontend/src/lib/api.ts`.                                                                |
| Go `any` boundary values |        15 | Used for JSON response/report assembly. Acceptable only at explicit JSON boundaries.                                                         |
| Dead code                | 0 obvious | No abandoned files found by inspection; generated Pages assets are intentional.                                                              |
| DRY violations           |         3 | File-to-input conversion, state JSON handling, and worker setup are local duplications/near-duplications.                                    |
| SOLID violations         |         2 | `SourceInspector` mixes input, persistence, diagnostics, and output controls; `ThreeViewport` mixes rendering and export.                    |
| Test coverage holes      |         5 | No tests for drag-drop/paste/import-state, copy/download/share, imported mesh repair handoff, backend-check error toast, or session restore. |

## Decisions

- Keep Go `any` in explicitly named JSON boundary helpers and structs only; do not spread it into domain code.
- Remove TypeScript multipart unsafe casts by using a dedicated `fetch` multipart boundary function.
- Split Source Inspector helper logic into reusable import/export/state utilities rather than expanding the component further.
- Add tests for the real-user path: import STL → repair imported mesh → export/share/copy diagnostic state.
