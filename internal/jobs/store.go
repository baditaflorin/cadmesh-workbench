package jobs

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("job not found")

type Store struct {
	mu      sync.RWMutex
	dataDir string
	jobs    map[string]*Job
}

type Paths struct {
	JobDir       string
	InputsDir    string
	ArtifactsDir string
}

func NewStore(dataDir string) (*Store, error) {
	if err := os.MkdirAll(filepath.Join(dataDir, "jobs"), 0o755); err != nil {
		return nil, err
	}

	store := &Store{
		dataDir: dataDir,
		jobs:    make(map[string]*Job),
	}
	if err := store.load(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *Store) Create(req JobRequest) (*Job, error) {
	now := time.Now().UTC()
	job := &Job{
		ID:         uuid.NewString(),
		Workflow:   req.Workflow,
		Name:       req.Name,
		Status:     StatusQueued,
		Parameters: copyMap(req.Parameters),
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	paths := s.Paths(job.ID)
	if err := os.MkdirAll(paths.InputsDir, 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(paths.ArtifactsDir, 0o755); err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.jobs[job.ID] = job
	s.mu.Unlock()

	if err := s.persist(job); err != nil {
		return nil, err
	}
	return cloneJob(job), nil
}

func (s *Store) List() []Job {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]Job, 0, len(s.jobs))
	for _, job := range s.jobs {
		out = append(out, *cloneJob(job))
	}
	sort.Slice(out, func(i int, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out
}

func (s *Store) Get(id string) (*Job, error) {
	s.mu.RLock()
	job, ok := s.jobs[id]
	s.mu.RUnlock()
	if !ok {
		return nil, ErrNotFound
	}
	return cloneJob(job), nil
}

func (s *Store) Update(id string, mutate func(*Job)) (*Job, error) {
	s.mu.Lock()
	job, ok := s.jobs[id]
	if !ok {
		s.mu.Unlock()
		return nil, ErrNotFound
	}
	mutate(job)
	job.UpdatedAt = time.Now().UTC()
	snapshot := cloneJob(job)
	s.mu.Unlock()

	if err := s.persist(snapshot); err != nil {
		return nil, err
	}
	return snapshot, nil
}

func (s *Store) Paths(id string) Paths {
	jobDir := filepath.Join(s.dataDir, "jobs", id)
	return Paths{
		JobDir:       jobDir,
		InputsDir:    filepath.Join(jobDir, "inputs"),
		ArtifactsDir: filepath.Join(jobDir, "artifacts"),
	}
}

func (s *Store) ArtifactPath(id string, artifactName string) string {
	return filepath.Join(s.Paths(id).ArtifactsDir, filepath.Base(artifactName))
}

func (s *Store) load() error {
	root := filepath.Join(s.dataDir, "jobs")
	entries, err := os.ReadDir(root)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		path := filepath.Join(root, entry.Name(), "job.json")
		body, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		var job Job
		if err := json.Unmarshal(body, &job); err != nil {
			continue
		}
		s.jobs[job.ID] = &job
	}
	return nil
}

func (s *Store) persist(job *Job) error {
	paths := s.Paths(job.ID)
	if err := os.MkdirAll(paths.JobDir, 0o755); err != nil {
		return err
	}
	body, err := json.MarshalIndent(job, "", "  ")
	if err != nil {
		return err
	}
	tmp := filepath.Join(paths.JobDir, "job.json.tmp")
	dst := filepath.Join(paths.JobDir, "job.json")
	if err := os.WriteFile(tmp, body, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, dst)
}

func cloneJob(job *Job) *Job {
	if job == nil {
		return nil
	}
	clone := *job
	clone.Parameters = copyMap(job.Parameters)
	clone.Inputs = append([]InputFile(nil), job.Inputs...)
	clone.Artifacts = append([]Artifact(nil), job.Artifacts...)
	clone.Logs = append([]string(nil), job.Logs...)
	return &clone
}

func copyMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}
