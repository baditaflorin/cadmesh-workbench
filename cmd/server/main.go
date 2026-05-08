package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/baditaflorin/cadmesh-workbench/internal/config"
	"github.com/baditaflorin/cadmesh-workbench/internal/httpapi"
	"github.com/baditaflorin/cadmesh-workbench/internal/jobs"
	"github.com/baditaflorin/cadmesh-workbench/internal/utils"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		utils.HandleErrorOrLogWithMessages(err, "failed to load configuration", "")
		os.Exit(1)
	}

	store, err := jobs.NewStore(cfg.DataDir)
	if err != nil {
		utils.HandleErrorOrLogWithMessages(err, "failed to initialize job store", "")
		os.Exit(1)
	}

	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	tools := jobs.DetectTools()
	metrics := httpapi.NewMetrics()
	pipeline := jobs.NewPipeline(tools)
	queue := jobs.NewQueue(store, pipeline, metrics, logger, 32)
	queue.Start(rootCtx)

	api := httpapi.NewServer(cfg, store, queue, metrics, tools, logger)
	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.Router(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("server listening", "addr", cfg.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			stop()
		}
	}()

	<-rootCtx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}
	logger.Info("server stopped")
}
