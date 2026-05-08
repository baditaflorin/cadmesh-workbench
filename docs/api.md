# API

OpenAPI contract: https://github.com/baditaflorin/cadmesh-workbench/blob/main/api/openapi.yaml

Local base URL:

```sh
http://localhost:8080
```

Health:

```sh
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

List native tool availability:

```sh
curl http://localhost:8080/api/v1/tools
```

Create a demo job:

```sh
curl -X POST http://localhost:8080/api/v1/jobs \
  -H 'content-type: application/json' \
  -d '{"workflow":"photogrammetry_to_gltf","name":"demo","parameters":{"quality":"preview"}}'
```

