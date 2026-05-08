# Architecture

Live site: https://baditaflorin.github.io/cadmesh-workbench/

Repository: https://github.com/baditaflorin/cadmesh-workbench

## Context

```mermaid
C4Context
title cadmesh-workbench context
Person(user, "Engineer or maker", "Inspects CAD, repairs meshes, and runs photogrammetry jobs.")
System_Boundary(project, "cadmesh-workbench") {
  System(frontend, "GitHub Pages frontend", "Static React app, CAD/mesh UI, Three.js viewer.")
  System(api, "Docker backend", "Go REST API, job queue, native tool adapters.")
}
System_Ext(github, "GitHub", "Repository, Pages, GHCR.")
System_Ext(paypal, "PayPal", "Optional project support link.")
Rel(user, frontend, "Uses in browser")
Rel(frontend, api, "Submits jobs through REST/JSON")
Rel(api, github, "Image distributed through GHCR")
Rel(frontend, github, "Links to repo")
Rel(frontend, paypal, "Links to support page")
```

## Containers

```mermaid
flowchart LR
  Browser["Browser\nReact + Vite + Three.js"] --> Pages["GitHub Pages\nmain/docs"]
  Browser --> API["Go API\ncmd/server"]
  API --> Jobs["Job queue\ninternal/jobs"]
  Jobs --> Tools["Native adapters\nCOLMAP / OpenMVS / Open3D / Draco"]
  Jobs --> Artifacts["Artifact store\nCADMESH_DATA_DIR"]
  Nginx["nginx\nhost port 25342"] --> API
  Prom["Prometheus optional"] --> API
```

The GitHub Pages boundary is explicit: the backend never serves frontend assets, and the frontend never contains secrets.
