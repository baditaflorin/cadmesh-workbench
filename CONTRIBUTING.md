# Contributing

Thank you for helping improve `cadmesh-workbench`.

## Local workflow

1. Install Node.js, Go, Docker, `gh`, `gitleaks`, and `lefthook` or use the plain hooks in `.githooks`.
2. Run `make install-hooks`.
3. Make focused commits using Conventional Commits, for example `feat: add mesh repair worker`.
4. Run `make lint`, `make test`, and `make smoke` before pushing.

Do not commit secrets, real `.env` files, private keys, generated credentials, or internal hostnames.
