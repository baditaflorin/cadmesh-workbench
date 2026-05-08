# 0003 Frontend framework and build tooling

## Status

Accepted

## Context

The UI needs typed state, accessible controls, lazy 3D rendering, API calls, and GitHub Pages-compatible output.

## Decision

Use React, TypeScript strict mode, Vite, Tailwind CSS, Zod, TanStack Query, Three.js, Comlink, and Playwright.

Vite builds into the repository `docs/` directory with base path `/cadmesh-workbench/`. The 3D workbench is lazy-loaded so the first route stays small and Pages-friendly.

## Consequences

- Local development is fast.
- The GitHub Pages base path is controlled in one Vite config.
- Heavy viewer code can be code-split behind user action.

## Alternatives considered

- Next.js: rejected because the static Pages output and repo simplicity are better served by Vite.
- Vanilla TypeScript: rejected because complex UI state and error boundaries benefit from React.

