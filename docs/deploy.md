# Deployment

The frontend is published by GitHub Pages from the `docs/` directory on the `main` branch.

Live URL: https://baditaflorin.github.io/cadmesh-workbench/

## Re-publish

1. Run `make build`.
2. Commit the updated `docs/` directory.
3. Push `main`.

## Rollback

Revert the publishing commit that changed `docs/`, then push `main`.

## Custom Domain

No custom domain is configured for v1. To add one, create a `CNAME` file in `docs/` and point DNS to GitHub Pages according to GitHub's Pages documentation.

