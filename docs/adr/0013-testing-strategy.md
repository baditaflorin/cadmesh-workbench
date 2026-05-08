# 0013 Testing strategy

## Status

Accepted

## Context

The repo has no GitHub Actions, so tests must be fast and reliable locally and through git hooks.

## Decision

Use:

- Go unit tests colocated with backend packages.
- Vitest unit tests for frontend logic.
- Playwright happy-path smoke test against the built `docs/` site.
- `scripts/smoke.sh` to build, serve, and test the Pages output.
- `make test`, `make lint`, `make smoke` as the stable entrypoints.

## Consequences

Contributors get one local workflow. Pre-push can run the full fast suite.

## Alternatives considered

- GitHub Actions: rejected by project constraint.
- Manual browser-only testing: rejected because Pages routing and build output need repeatable checks.

