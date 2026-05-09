package jobs

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/baditaflorin/cadmesh-workbench/internal/version"
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
	inputs, sourceDigest, err := summarizeInputs(job.Inputs)
	if err != nil {
		return Result{}, err
	}
	missingTools := p.missingRequiredTools(job.Workflow)
	resultMode := ResultModePreviewOnly
	warnings := []string{
		"Preview-only result: native CAD/photogrammetry execution is not yet enabled for this job.",
	}
	if len(missingTools) > 0 {
		warnings = append(warnings, "Missing native tools: "+strings.Join(missingTools, ", "))
	}
	confidence := map[string]float64{
		"artifact_truthfulness": 1,
		"native_execution":      0,
		"preview_geometry":      0.72,
	}
	report := map[string]any{
		"schema_version": "phase2-job-report/v1",
		"job_id":         job.ID,
		"workflow":       job.Workflow,
		"source_id":      sourceID(job.Name, sourceDigest),
		"job_created_at": job.CreatedAt.UTC().Format(time.RFC3339),
		"parameters":     sortedParameters(job.Parameters),
		"inputs":         inputs,
		"tools":          sortedTools(p.tools),
		"result_mode":    resultMode,
		"warnings":       warnings,
		"confidence":     confidence,
		"provenance": map[string]any{
			"app":              "cadmesh-workbench",
			"app_version":      version.Version,
			"commit":           version.Commit,
			"deterministic":    true,
			"source_checksums": inputChecksums(inputs),
			"source_digest":    sourceDigest,
		},
	}

	switch job.Workflow {
	case WorkflowPhotogrammetryToGLTF:
		logs = append(logs, "created preview-only glTF from uploaded photo set")
		report["pipeline"] = []string{"COLMAP sparse reconstruction", "OpenMVS dense mesh", "Open3D cleanup", "Draco compression", "glTF export"}
	case WorkflowMeshRepair:
		logs = append(logs, "created preview-only repair mesh and topology report")
		report["pipeline"] = []string{"deduplicate vertices", "recompute normals", "remove degenerate faces", "quadric decimation"}
	case WorkflowCADBoolean:
		logs = append(logs, "created preview-only parametric boolean mesh")
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

	return Result{Artifacts: artifacts, Logs: logs, ResultMode: resultMode, Warnings: warnings}, nil
}

type inputReport struct {
	Name        string `json:"name"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
	Checksum    string `json:"checksum"`
}

func summarizeInputs(inputs []InputFile) ([]inputReport, string, error) {
	sorted := append([]InputFile(nil), inputs...)
	sort.Slice(sorted, func(i int, j int) bool {
		return sorted[i].Name < sorted[j].Name
	})
	reports := make([]inputReport, 0, len(sorted))
	sourceHash := sha256.New()
	for _, input := range sorted {
		checksum, err := checksumInput(input)
		if err != nil {
			return nil, "", err
		}
		_, _ = sourceHash.Write([]byte(input.Name))
		_, _ = sourceHash.Write([]byte(checksum))
		reports = append(reports, inputReport{
			Name:        input.Name,
			ContentType: input.ContentType,
			Size:        input.Size,
			Checksum:    checksum,
		})
	}
	if len(reports) == 0 {
		_, _ = sourceHash.Write([]byte("no-inputs"))
	}
	return reports, hex.EncodeToString(sourceHash.Sum(nil)), nil
}

func checksumInput(input InputFile) (string, error) {
	if input.Path == "" {
		sum := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%d", input.Name, input.ContentType, input.Size)))
		return hex.EncodeToString(sum[:]), nil
	}
	// #nosec G304 -- input.Path is assigned by saveInputs inside the job input directory.
	body, err := os.ReadFile(input.Path)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:]), nil
}

func sourceID(name string, digest string) string {
	safe := strings.ToLower(strings.TrimSpace(name))
	safe = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		return '-'
	}, safe)
	safe = strings.Trim(safe, "-")
	if len(safe) > 48 {
		safe = safe[:48]
	}
	if safe == "" {
		safe = "job"
	}
	return safe + "-" + digest[:12]
}

func sortedParameters(parameters map[string]string) map[string]string {
	if len(parameters) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(parameters))
	for key, value := range parameters {
		out[key] = value
	}
	return out
}

func sortedTools(tools []Tool) []Tool {
	out := append([]Tool(nil), tools...)
	sort.Slice(out, func(i int, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

func inputChecksums(inputs []inputReport) []string {
	out := make([]string, 0, len(inputs))
	for _, input := range inputs {
		out = append(out, input.Checksum)
	}
	sort.Strings(out)
	return out
}

func (p *Pipeline) missingRequiredTools(workflow Workflow) []string {
	required := requiredToolNames(workflow)
	available := ToolAvailabilityMap(p.tools)
	missing := make([]string, 0, len(required))
	for _, name := range required {
		if !available[name] {
			missing = append(missing, name)
		}
	}
	return missing
}

func requiredToolNames(workflow Workflow) []string {
	switch workflow {
	case WorkflowPhotogrammetryToGLTF:
		return []string{"COLMAP", "OpenMVS", "Open3D", "Draco"}
	case WorkflowMeshRepair:
		return []string{"MeshLab", "Open3D", "Draco"}
	case WorkflowCADBoolean:
		return []string{"OpenCascade/OCCT"}
	default:
		return nil
	}
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
