# Deployment

Repository: https://github.com/baditaflorin/cadmesh-workbench

Frontend: https://baditaflorin.github.io/cadmesh-workbench/

Backend image: ghcr.io/baditaflorin/cadmesh-workbench:latest

## Prerequisites

- Docker Engine with Compose v2
- DNS pointing your backend domain at the server
- Let's Encrypt certificates mounted at `/etc/letsencrypt`
- A `deploy/.env` file based on `deploy/.env.example`

## First deploy

```sh
cd deploy
cp .env.example .env
docker compose pull
docker compose up -d
```

The API is exposed through nginx on host port `25342`.

## TLS

Replace `your-domain.example` in `deploy/nginx/nginx.conf` with the real domain before starting nginx.

Generate certificates with certbot on the host, then restart:

```sh
docker compose restart nginx
```

## Observability

Prometheus is optional:

```sh
docker compose --profile observability up -d
```

`/metrics` is available only inside the Compose network and blocked by nginx.

## Rollback

Pin the previous image tag in `deploy/docker-compose.yml`, then run:

```sh
docker compose pull
docker compose up -d
```

## Logs

```sh
docker compose logs -f app
docker compose logs -f nginx
```

## Backup

Back up the `cadmesh-data` Docker volume. It contains job metadata, inputs, and artifacts.

