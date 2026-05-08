# 0045 State taxonomy and state machine

## Status

Accepted

## Context

The app needs coherent behavior for empty, loading, loaded, too-large, recoverable error, fatal error, in-progress, and cancelled states.

## Decision

Represent source analysis states explicitly:

- `idle`
- `loading`
- `loaded-empty`
- `loaded-some`
- `loaded-many`
- `loaded-too-many`
- `error-recoverable`
- `error-fatal`
- `in-progress`
- `cancelled`

Every state has at least one exit: reset, retry, cancel, inspect, or continue with preview.

## Consequences

Fast repeated file selections become last-input-wins. Cancelled and stale results cannot overwrite newer state.

## Alternatives considered

- Boolean loading/error flags: rejected because they cannot express recovery paths.
