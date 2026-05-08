# 0016 Local git hooks

## Status

Accepted

## Context

The project has no GitHub Actions, so local hooks must enforce hygiene before commits and pushes.

## Decision

Use a plain `.githooks/` directory wired by `make install-hooks`.

Hooks:

- `pre-commit`: formatting, linters, type checking, and `gitleaks protect --staged` when installed.
- `commit-msg`: Conventional Commits validator.
- `pre-push`: `make test`, `make build`, and `make smoke`.
- `post-merge` and `post-checkout`: dependency and generated-code reminders.

## Consequences

The workflow has no external CI dependency. Contributors must install hooks locally.

## Alternatives considered

- Lefthook: acceptable later, but plain hooks are transparent and have no extra dependency.

