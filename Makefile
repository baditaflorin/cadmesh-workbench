SHELL := /bin/sh

VERSION ?= $(shell node -e "console.log(require('./package.json').version)")
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo local)
IMAGE ?= ghcr.io/baditaflorin/cadmesh-workbench
PORT ?= 4173
GO_PACKAGES ?= ./cmd/server ./internal/config ./internal/httpapi ./internal/jobs ./internal/utils ./internal/version
DOCKER ?= docker
DOCKER_CONTEXT ?=
DOCKER_CMD = $(DOCKER) $(if $(DOCKER_CONTEXT),--context=$(DOCKER_CONTEXT),)

.PHONY: help install-hooks dev build data test test-integration smoke lint fmt pages-preview docker-build docker-push release compose-up compose-down clean hooks-pre-commit hooks-commit-msg hooks-pre-push

help:
	@printf '%s\n' \
		'help              List targets' \
		'install-hooks     Wire .githooks into this checkout' \
		'dev               Run frontend dev server and backend API' \
		'build             Build backend and GitHub Pages frontend into docs/' \
		'data              Mode B no-op' \
		'test              Run Go and frontend unit tests' \
		'test-integration  Run integration tests' \
		'smoke             Build, serve docs/, and run Playwright smoke tests' \
		'lint              Run Go vet, ESLint, Prettier, and TypeScript checks' \
		'fmt               Format Go and frontend files' \
		'pages-preview     Serve docs/ as Pages would' \
		'docker-build      Build linux/amd64 backend image' \
		'docker-push       Push latest, version, and commit image tags' \
		'release           Tag release and push Docker image' \
		'compose-up        Run local Docker backend' \
		'compose-down      Stop local Docker backend' \
		'clean             Remove local build/cache outputs'

install-hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/*

dev:
	@trap 'kill 0' INT TERM EXIT; \
	CGO_ENABLED=0 go run ./cmd/server & \
	npm run dev

build:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/baditaflorin/cadmesh-workbench/internal/version.Version=$(VERSION) -X github.com/baditaflorin/cadmesh-workbench/internal/version.Commit=$(COMMIT)" -o bin/cadmesh-server ./cmd/server
	VITE_APP_VERSION=$(VERSION) VITE_GIT_COMMIT=$(COMMIT) npm run build
	test -s docs/index.html
	test -s docs/404.html

data:
	@printf '%s\n' 'Mode C uses runtime jobs; no static data pipeline is required.'

test:
	CGO_ENABLED=0 go test $(GO_PACKAGES)
	npm test

test-integration:
	CGO_ENABLED=0 go test -tags=integration ./test/integration/...

smoke:
	scripts/smoke.sh

lint:
	CGO_ENABLED=0 go vet $(GO_PACKAGES)
	npm run lint
	npm run format:check
	npm run typecheck
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run $(GO_PACKAGES); else printf '%s\n' 'golangci-lint not installed; skipped'; fi

fmt:
	gofmt -w cmd internal
	@if command -v goimports >/dev/null 2>&1; then goimports -w cmd internal; fi
	npm run format

pages-preview:
	npm run preview -- --host 127.0.0.1 --port $(PORT)

docker-build:
	$(DOCKER_CMD) buildx build --platform linux/amd64 --load --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --build-arg CREATED=$$(date -u +%Y-%m-%dT%H:%M:%SZ) -t $(IMAGE):$(COMMIT) -t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

docker-push:
	$(DOCKER_CMD) buildx build --platform linux/amd64 --push --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --build-arg CREATED=$$(date -u +%Y-%m-%dT%H:%M:%SZ) -t $(IMAGE):$(COMMIT) -t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

release: test build smoke docker-push
	git tag -a v$(VERSION) -m "v$(VERSION)"
	git push origin v$(VERSION)

compose-up:
	docker compose -f deploy/docker-compose.dev.yml up --build

compose-down:
	docker compose -f deploy/docker-compose.dev.yml down

hooks-pre-commit:
	.githooks/pre-commit

hooks-commit-msg:
	.githooks/commit-msg .git/COMMIT_EDITMSG

hooks-pre-push:
	.githooks/pre-push

clean:
	rm -rf bin coverage tmp frontend/.vite
