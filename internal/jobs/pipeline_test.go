package jobs

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestPipelineReportIsTruthfulAndDeterministic(t *testing.T) {
	inputDir := t.TempDir()
	inputPath := filepath.Join(inputDir, "benchy.stl")
	require.NoError(t, os.WriteFile(inputPath, []byte("solid benchy\nendsolid benchy\n"), 0o600))

	job := Job{
		ID:       "job-1",
		Workflow: WorkflowMeshRepair,
		Name:     "mesh repair",
		Status:   StatusRunning,
		Parameters: map[string]string{
			"target_ratio": "0.5",
		},
		Inputs: []InputFile{
			{
				Name:        "benchy.stl",
				ContentType: "model/stl",
				Size:        27,
				Path:        inputPath,
			},
		},
		CreatedAt: time.Date(2026, 5, 9, 10, 0, 0, 0, time.UTC),
	}
	pipeline := NewPipeline(nil)

	first := runPipelineForTest(t, pipeline, job)
	second := runPipelineForTest(t, pipeline, job)

	require.Equal(t, ResultModePreviewOnly, first.result.ResultMode)
	require.Contains(t, first.result.Warnings[0], "Preview-only")
	require.Equal(t, first.reportBody, second.reportBody)

	var report map[string]any
	require.NoError(t, json.Unmarshal(first.reportBody, &report))
	require.Equal(t, "phase2-job-report/v1", report["schema_version"])
	require.Equal(t, string(ResultModePreviewOnly), report["result_mode"])
	require.NotEmpty(t, report["source_id"])
	require.NotEmpty(t, report["warnings"])
	require.NotEmpty(t, report["provenance"])
}

type pipelineRun struct {
	result     Result
	reportBody []byte
}

func runPipelineForTest(t *testing.T, pipeline *Pipeline, job Job) pipelineRun {
	t.Helper()
	root := t.TempDir()
	paths := Paths{
		JobDir:       root,
		InputsDir:    filepath.Join(root, "inputs"),
		ArtifactsDir: filepath.Join(root, "artifacts"),
	}
	result, err := pipeline.Run(context.Background(), job, paths)
	require.NoError(t, err)
	reportBody, err := os.ReadFile(filepath.Join(paths.ArtifactsDir, "report.json"))
	require.NoError(t, err)
	return pipelineRun{result: result, reportBody: reportBody}
}
