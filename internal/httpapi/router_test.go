package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/baditaflorin/cadmesh-workbench/internal/config"
	"github.com/baditaflorin/cadmesh-workbench/internal/jobs"
	"github.com/stretchr/testify/require"
)

func TestCreateJobHappyPath(t *testing.T) {
	store, err := jobs.NewStore(t.TempDir())
	require.NoError(t, err)
	metrics := NewMetrics()
	pipeline := jobs.NewPipeline(nil)
	queue := jobs.NewQueue(store, pipeline, metrics, slog.New(slog.NewTextHandler(os.Stdout, nil)), 4)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	queue.Start(ctx)

	server := NewServer(config.Config{
		Addr:           ":0",
		DataDir:        t.TempDir(),
		AllowedOrigins: []string{"http://localhost:5173"},
		PublicBaseURL:  "http://example.test",
	}, store, queue, metrics, nil, slog.Default())

	body, err := json.Marshal(jobs.JobRequest{
		Workflow: jobs.WorkflowMeshRepair,
		Name:     "mesh repair",
	})
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/jobs", bytes.NewReader(body))
	req.Header.Set("content-type", "application/json")
	rec := httptest.NewRecorder()
	server.Router().ServeHTTP(rec, req)
	require.Equal(t, http.StatusAccepted, rec.Code)

	var created jobs.Job
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &created))
	require.NotEmpty(t, created.ID)

	require.Eventually(t, func() bool {
		got, err := store.Get(created.ID)
		return err == nil && got.Status == jobs.StatusSucceeded && len(got.Artifacts) == 2
	}, 2*time.Second, 25*time.Millisecond)
}
