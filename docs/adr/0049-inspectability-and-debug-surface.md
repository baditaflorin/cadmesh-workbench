# 0049 Inspectability and debug surface

## Status

Accepted

## Context

Power users and maintainers need to understand inference decisions.

## Decision

Enable a debug surface with `?debug=1`. It exposes:

- Source state.
- Diagnostic manifest.
- Confidence scores.
- Parser evidence.
- Performance marks.
- Activity history.

## Consequences

Support can inspect why the app made a decision without adding visible chrome for normal users.

## Alternatives considered

- Console-only debug output: rejected because production console logging is intentionally minimal.
