# Runbook

## Services

- Frontend: https://baditaflorin.github.io/cadmesh-workbench/
- Backend image: ghcr.io/baditaflorin/cadmesh-workbench
- Public backend host port: 25342
- Internal backend port: 8080

## Expected resources

Preview jobs: 1 CPU, 512 MB RAM, 1 GB disk.

Photogrammetry jobs: 4+ CPU, 8+ GB RAM, 20+ GB disk depending on photo count and quality.

## Debugging

Check health:

```sh
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

Check logs:

```sh
docker compose -f deploy/docker-compose.yml logs -f app
```

Check metrics locally:

```sh
curl http://localhost:8080/metrics
```

## Backups

Back up the backend data directory configured by `CADMESH_DATA_DIR`. It contains job metadata and artifacts.

## Failure modes

If Prometheus is down, the app continues serving. If native tools are missing, `/api/v1/tools` reports them as unavailable and submitted jobs fall back to preview artifacts when possible.

