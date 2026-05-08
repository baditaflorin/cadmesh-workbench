# syntax=docker/dockerfile:1.7

ARG GO_VERSION=1.26.2

FROM --platform=$BUILDPLATFORM golang:${GO_VERSION}-alpine AS builder
WORKDIR /src

RUN apk add --no-cache ca-certificates git

COPY go.mod go.sum ./
RUN go mod download

COPY api ./api
COPY cmd ./cmd
COPY internal ./internal
COPY pkg ./pkg

ARG TARGETOS=linux
ARG TARGETARCH=amd64
ARG VERSION=0.1.0
ARG COMMIT=local
ARG CREATED=unknown

RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -trimpath \
    -ldflags="-s -w -X github.com/baditaflorin/cadmesh-workbench/internal/version.Version=${VERSION} -X github.com/baditaflorin/cadmesh-workbench/internal/version.Commit=${COMMIT} -X github.com/baditaflorin/cadmesh-workbench/internal/version.Date=${CREATED}" \
    -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app

ARG VERSION=0.1.0
ARG COMMIT=local
ARG CREATED=unknown

LABEL org.opencontainers.image.title="cadmesh-workbench" \
      org.opencontainers.image.description="CAD, mesh repair, and photogrammetry-to-glTF backend API" \
      org.opencontainers.image.source="https://github.com/baditaflorin/cadmesh-workbench" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${CREATED}" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /out/server /app/server
COPY --from=builder /src/api /app/api

USER nonroot:nonroot
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/app/server", "healthcheck"]

ENTRYPOINT ["/app/server"]

