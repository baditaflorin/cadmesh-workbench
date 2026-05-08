package jobs

import "time"

type Workflow string

const (
	WorkflowPhotogrammetryToGLTF Workflow = "photogrammetry_to_gltf"
	WorkflowMeshRepair           Workflow = "mesh_repair"
	WorkflowCADBoolean           Workflow = "cad_boolean"
)

type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusSucceeded Status = "succeeded"
	StatusFailed    Status = "failed"
)

type JobRequest struct {
	Workflow   Workflow          `json:"workflow" validate:"required"`
	Name       string            `json:"name" validate:"required,min=1,max=120"`
	Parameters map[string]string `json:"parameters,omitempty"`
}

type Job struct {
	ID         string            `json:"id"`
	Workflow   Workflow          `json:"workflow"`
	Name       string            `json:"name"`
	Status     Status            `json:"status"`
	Parameters map[string]string `json:"parameters,omitempty"`
	Inputs     []InputFile       `json:"inputs,omitempty"`
	Artifacts  []Artifact        `json:"artifacts,omitempty"`
	Logs       []string          `json:"logs,omitempty"`
	Error      string            `json:"error,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
	StartedAt  *time.Time        `json:"started_at,omitempty"`
	FinishedAt *time.Time        `json:"finished_at,omitempty"`
}

type InputFile struct {
	Name        string `json:"name"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
	Path        string `json:"-"`
}

type Artifact struct {
	Name        string    `json:"name"`
	ContentType string    `json:"content_type"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"created_at"`
	URL         string    `json:"url,omitempty"`
}

type Result struct {
	Artifacts []Artifact
	Logs      []string
}

func (w Workflow) Valid() bool {
	switch w {
	case WorkflowPhotogrammetryToGLTF, WorkflowMeshRepair, WorkflowCADBoolean:
		return true
	default:
		return false
	}
}
