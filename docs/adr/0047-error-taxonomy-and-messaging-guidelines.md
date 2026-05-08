# 0047 Error taxonomy and messaging guidelines

## Status

Accepted

## Context

Errors need to be recoverable where possible and clear when fatal.

## Decision

Classify errors:

- `recoverable`: unsupported-but-convertible, missing sibling file, too few photos, truncated-but-identified, native tools unavailable.
- `fatal`: unreadable bytes, unknown format with no route, invalid backend contract.

Every error includes:

- What failed.
- Why it failed in domain terms.
- Now what the user can do.

## Consequences

The app protects user work and points to next steps.

## Alternatives considered

- Throwing generic errors: rejected.
