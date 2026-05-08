# 0010 GitHub Pages publishing strategy

## Status

Accepted

## Context

The live GitHub Pages URL is a first-class deliverable from the first commit. The build output must be committed because GitHub Actions are explicitly not used.

## Decision

Publish from `main` branch `/docs`.

Vite writes the production frontend directly to `docs/`. The `.gitignore` ignores generic `dist/` but never ignores `docs/`. The frontend base path is `/cadmesh-workbench/`. A generated `404.html` mirrors `index.html` for SPA fallback. Hashed assets are emitted under `docs/assets/`.

Live URL: https://baditaflorin.github.io/cadmesh-workbench/

## Consequences

Every frontend publishing change is visible in git diffs. Rollback is a normal git revert. Build output churn is accepted to avoid GitHub Actions.

## Alternatives considered

- `gh-pages` branch: rejected because local publishing would be more complicated.
- `main /`: rejected because source and publish artifacts would be mixed at repo root.

