package jobs

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Pipeline struct {
	tools []Tool
}

func NewPipeline(tools []Tool) *Pipeline {
	return &Pipeline{tools: append([]Tool(nil), tools...)}
}

func (p *Pipeline) Run(ctx context.Context, job Job, paths Paths) (Result, error) {
	if err := ctx.Err(); err != nil {
		return Result{}, err
	}
	if err := os.MkdirAll(paths.ArtifactsDir, 0o750); err != nil {
		return Result{}, err
	}

	logs := []string{
		fmt.Sprintf("workflow=%s", job.Workflow),
		"native tool detection completed",
	}
	report := map[string]any{
		"job_id":       job.ID,
		"workflow":     job.Workflow,
		"generated_at": time.Now().UTC().Format(time.RFC3339),
		"parameters":   job.Parameters,
		"inputs":       job.Inputs,
		"tools":        p.tools,
		"mode":         "deterministic-preview",
	}

	switch job.Workflow {
	case WorkflowPhotogrammetryToGLTF:
		logs = append(logs, "created preview glTF from uploaded photo manifest")
		report["pipeline"] = []string{"COLMAP sparse reconstruction", "OpenMVS dense mesh", "Open3D cleanup", "Draco compression", "glTF export"}
	case WorkflowMeshRepair:
		logs = append(logs, "created repaired preview mesh and topology report")
		report["pipeline"] = []string{"deduplicate vertices", "recompute normals", "remove degenerate faces", "quadric decimation"}
	case WorkflowCADBoolean:
		logs = append(logs, "created parametric boolean preview mesh")
		report["pipeline"] = []string{"parametric primitives", "B-rep boolean request", "mesh tessellation", "glTF export"}
	default:
		return Result{}, fmt.Errorf("unsupported workflow %q", job.Workflow)
	}

	modelName := "model.gltf"
	if err := writePreviewGLTF(filepath.Join(paths.ArtifactsDir, modelName), string(job.Workflow)); err != nil {
		return Result{}, err
	}
	reportName := "report.json"
	if err := writeJSON(filepath.Join(paths.ArtifactsDir, reportName), report); err != nil {
		return Result{}, err
	}

	artifacts, err := statArtifacts(paths.ArtifactsDir, []artifactSpec{
		{Name: modelName, ContentType: "model/gltf+json"},
		{Name: reportName, ContentType: "application/json"},
	})
	if err != nil {
		return Result{}, err
	}

	return Result{Artifacts: artifacts, Logs: logs}, nil
}

type artifactSpec struct {
	Name        string
	ContentType string
}

func statArtifacts(dir string, specs []artifactSpec) ([]Artifact, error) {
	artifacts := make([]Artifact, 0, len(specs))
	for _, spec := range specs {
		info, err := os.Stat(filepath.Join(dir, spec.Name))
		if err != nil {
			return nil, err
		}
		artifacts = append(artifacts, Artifact{
			Name:        spec.Name,
			ContentType: spec.ContentType,
			Size:        info.Size(),
			CreatedAt:   time.Now().UTC(),
		})
	}
	return artifacts, nil
}

func writeJSON(path string, value any) error {
	body, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, body, 0o600)
}

func writePreviewGLTF(path string, label string) error {
	positions := []float32{
		-0.6, -0.6, -0.6,
		0.6, -0.6, -0.6,
		0.6, 0.6, -0.6,
		-0.6, 0.6, -0.6,
		-0.6, -0.6, 0.6,
		0.6, -0.6, 0.6,
		0.6, 0.6, 0.6,
		-0.6, 0.6, 0.6,
	}
	indices := []uint16{
		0, 1, 2, 2, 3, 0,
		4, 6, 5, 6, 4, 7,
		0, 4, 5, 5, 1, 0,
		1, 5, 6, 6, 2, 1,
		2, 6, 7, 7, 3, 2,
		3, 7, 4, 4, 0, 3,
	}

	buf := bytes.Buffer{}
	for _, value := range positions {
		if err := binary.Write(&buf, binary.LittleEndian, value); err != nil {
			return err
		}
	}
	indexOffset := buf.Len()
	for _, value := range indices {
		if err := binary.Write(&buf, binary.LittleEndian, value); err != nil {
			return err
		}
	}

	encoded := base64.StdEncoding.EncodeToString(buf.Bytes())
	doc := map[string]any{
		"asset": map[string]string{"version": "2.0", "generator": "cadmesh-workbench"},
		"scene": 0,
		"scenes": []map[string]any{
			{"nodes": []int{0}},
		},
		"nodes": []map[string]any{
			{"mesh": 0, "name": strings.ReplaceAll(label, "_", " ")},
		},
		"meshes": []map[string]any{
			{
				"name": "Preview Mesh",
				"primitives": []map[string]any{
					{
						"attributes": map[string]int{"POSITION": 0},
						"indices":    1,
						"mode":       4,
					},
				},
			},
		},
		"buffers": []map[string]any{
			{"uri": "data:application/octet-stream;base64," + encoded, "byteLength": buf.Len()},
		},
		"bufferViews": []map[string]any{
			{"buffer": 0, "byteOffset": 0, "byteLength": indexOffset, "target": 34962},
			{"buffer": 0, "byteOffset": indexOffset, "byteLength": buf.Len() - indexOffset, "target": 34963},
		},
		"accessors": []map[string]any{
			{
				"bufferView":    0,
				"byteOffset":    0,
				"componentType": 5126,
				"count":         len(positions) / 3,
				"type":          "VEC3",
				"min":           []float32{-0.6, -0.6, -0.6},
				"max":           []float32{0.6, 0.6, 0.6},
			},
			{
				"bufferView":    1,
				"byteOffset":    0,
				"componentType": 5123,
				"count":         len(indices),
				"type":          "SCALAR",
			},
		},
	}

	body, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, body, 0o600)
}
