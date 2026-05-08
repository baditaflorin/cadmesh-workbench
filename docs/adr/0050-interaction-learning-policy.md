# 0050 Interaction-learning policy

## Status

Accepted

## Context

Phase 2 should remember corrections within a session without surprising the user.

## Decision

Persist only transparent, local preferences:

- Backend URL in IndexedDB.
- Last diagnostic route in session memory.
- User route override in session memory.

Do not train a hidden model or sync preferences across devices in Phase 2.

## Consequences

The app feels less repetitive without becoming unpredictable.

## Alternatives considered

- Cross-device per-user defaults: rejected because auth/sync is out of scope.
