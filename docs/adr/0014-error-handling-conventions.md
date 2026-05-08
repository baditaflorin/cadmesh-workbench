# 0014 Error handling conventions

## Status

Accepted

## Context

Backend jobs involve file IO, user uploads, native binaries, and long-running commands. Errors must be explicit and recoverable.

## Decision

Never panic for expected failures. Return wrapped errors with `%w`. HTTP handlers return JSON problem responses. Job failures are persisted in job state with a user-readable message.

Add `internal/utils.HandleErrorOrLogWithMessages(err, errMsg, successMsg)` to satisfy the standing project convention.

## Consequences

Failures can be inspected through the API and logs. Native tool failures become job failures rather than process crashes.

## Alternatives considered

- Panicking on unexpected tool failures: rejected because one bad job must not bring down the API.
