package config

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Addr           string
	DataDir        string
	AllowedOrigins []string
	PublicBaseURL  string
}

func Load() (Config, error) {
	dataDir := env("CADMESH_DATA_DIR", "./var/cadmesh")
	absDataDir, err := filepath.Abs(dataDir)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		Addr:           env("CADMESH_ADDR", ":8080"),
		DataDir:        absDataDir,
		AllowedOrigins: splitCSV(env("CADMESH_ALLOWED_ORIGINS", "http://localhost:5173,https://baditaflorin.github.io")),
		PublicBaseURL:  env("CADMESH_PUBLIC_BASE_URL", "http://localhost:8080"),
	}

	if cfg.Addr == "" {
		return Config{}, errors.New("CADMESH_ADDR cannot be empty")
	}
	if cfg.DataDir == "" {
		return Config{}, errors.New("CADMESH_DATA_DIR cannot be empty")
	}
	if len(cfg.AllowedOrigins) == 0 {
		return Config{}, errors.New("CADMESH_ALLOWED_ORIGINS must include at least one origin")
	}

	return cfg, nil
}

func env(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
