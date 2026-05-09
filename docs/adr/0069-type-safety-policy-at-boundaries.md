# 0069 Type Safety Policy At Boundaries

## Status

Accepted.

## Context

OpenAPI multipart calls required unsafe TypeScript casts.

## Decision

Use generated OpenAPI types for JSON endpoints and a dedicated `fetch` multipart helper for `FormData`. External JSON state is validated with zod before use.

## Consequences

No `as unknown as` casts remain in frontend API code.

## Alternatives Considered

- Keep openapi-fetch for multipart: rejected because the casts made the boundary unclear.
