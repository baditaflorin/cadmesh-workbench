# 0009 Configuration and secrets management

## Status

Accepted

## Context

The frontend cannot contain secrets. The backend needs runtime configuration for addresses, data directories, CORS, version, and optional native tool paths.

## Decision

Use environment variables for all configuration. Commit `.env.example` with placeholders only. Do not commit real `.env` files. Run gitleaks from local hooks.

The backend accepts:

- `CADMESH_ADDR`
- `CADMESH_DATA_DIR`
- `CADMESH_ALLOWED_ORIGINS`
- `CADMESH_PUBLIC_BASE_URL`

The frontend accepts:

- `VITE_API_BASE_URL`
- `VITE_APP_VERSION`
- `VITE_GIT_COMMIT`

## Consequences

Deployment can configure the backend without code changes. Pages builds can burn in only public values.

## Alternatives considered

- Checked-in config with environment overrides: rejected to reduce accidental secret exposure.
