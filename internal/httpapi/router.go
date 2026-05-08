package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/baditaflorin/cadmesh-workbench/internal/config"
	"github.com/baditaflorin/cadmesh-workbench/internal/jobs"
	"github.com/baditaflorin/cadmesh-workbench/internal/version"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-playground/validator/v10"
)

type Server struct {
	cfg       config.Config
	store     *jobs.Store
	queue     *jobs.Queue
	metrics   *Metrics
	tools     []jobs.Tool
	validator *validator.Validate
	logger    *slog.Logger
}

func NewServer(cfg config.Config, store *jobs.Store, queue *jobs.Queue, metrics *Metrics, tools []jobs.Tool, logger *slog.Logger) *Server {
	for _, tool := range tools {
		metrics.SetToolAvailable(tool.Name, tool.Available)
	}
	return &Server{
		cfg:       cfg,
		store:     store,
		queue:     queue,
		metrics:   metrics,
		tools:     append([]jobs.Tool(nil), tools...),
		validator: validator.New(),
		logger:    logger,
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
	r.Use(s.metrics.Middleware)

	r.Get("/healthz", s.health)
	r.Get("/readyz", s.ready)
	r.Get("/metrics", func(w http.ResponseWriter, r *http.Request) {
		s.metrics.Handler().ServeHTTP(w, r)
	})
	r.Get("/api/openapi.yaml", s.openapi)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/tools", s.toolsHandler)
		r.Get("/jobs", s.listJobs)
		r.Post("/jobs", s.createJob)
		r.Get("/jobs/{id}", s.getJob)
		r.Get("/jobs/{id}/artifacts/{artifact}", s.getArtifact)
	})

	return r
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"version": version.Version,
		"commit":  version.Commit,
		"date":    version.Date,
	})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if err := os.MkdirAll(s.cfg.DataDir, 0o755); err != nil {
		writeError(w, http.StatusServiceUnavailable, "data directory is not writable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func (s *Server) openapi(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "api/openapi.yaml")
}

func (s *Server) toolsHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"tools": s.tools})
}

func (s *Server) listJobs(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"jobs": s.withArtifactURLs(s.store.List())})
}

func (s *Server) getJob(w http.ResponseWriter, r *http.Request) {
	job, err := s.store.Get(chi.URLParam(r, "id"))
	if err != nil {
		status := http.StatusInternalServerError
		message := "failed to load job"
		if errors.Is(err, jobs.ErrNotFound) {
			status = http.StatusNotFound
			message = "job not found"
		}
		writeError(w, status, message)
		return
	}
	writeJSON(w, http.StatusOK, s.withArtifactURL(*job))
}

func (s *Server) createJob(w http.ResponseWriter, r *http.Request) {
	req, inputParts, err := s.parseJobRequest(w, r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !req.Workflow.Valid() {
		writeError(w, http.StatusBadRequest, "unsupported workflow")
		return
	}
	if err := s.validator.Struct(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	job, err := s.store.Create(req)
	if err != nil {
		s.logger.Error("failed to create job", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create job")
		return
	}

	if len(inputParts) > 0 {
		inputs, saveErr := s.saveInputs(r, job.ID, inputParts)
		if saveErr != nil {
			writeError(w, http.StatusBadRequest, saveErr.Error())
			return
		}
		job, err = s.store.Update(job.ID, func(job *jobs.Job) {
			job.Inputs = inputs
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to persist inputs")
			return
		}
	}

	s.metrics.JobSubmitted(string(job.Workflow))
	s.queue.Enqueue(job.ID)
	writeJSON(w, http.StatusAccepted, s.withArtifactURL(*job))
}

func (s *Server) parseJobRequest(w http.ResponseWriter, r *http.Request) (jobs.JobRequest, []multipartInput, error) {
	contentType := r.Header.Get("content-type")
	mediaType, _, _ := mime.ParseMediaType(contentType)
	if mediaType == "multipart/form-data" {
		r.Body = http.MaxBytesReader(w, r.Body, 2<<30)
		if err := r.ParseMultipartForm(2 << 30); err != nil {
			return jobs.JobRequest{}, nil, fmt.Errorf("invalid multipart request: %w", err)
		}
		req := jobs.JobRequest{
			Workflow: jobs.Workflow(r.FormValue("workflow")),
			Name:     r.FormValue("name"),
		}
		if params := strings.TrimSpace(r.FormValue("parameters")); params != "" {
			if err := json.Unmarshal([]byte(params), &req.Parameters); err != nil {
				return jobs.JobRequest{}, nil, fmt.Errorf("invalid parameters JSON: %w", err)
			}
		}
		var parts []multipartInput
		for field, headers := range r.MultipartForm.File {
			for _, header := range headers {
				parts = append(parts, multipartInput{Field: field, Filename: header.Filename, Header: header})
			}
		}
		return req, parts, nil
	}

	var req jobs.JobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return jobs.JobRequest{}, nil, fmt.Errorf("invalid JSON request: %w", err)
	}
	return req, nil, nil
}

type multipartInput struct {
	Field    string
	Filename string
	Header   *multipart.FileHeader
}

func (s *Server) saveInputs(r *http.Request, jobID string, parts []multipartInput) ([]jobs.InputFile, error) {
	paths := s.store.Paths(jobID)
	if err := os.MkdirAll(paths.InputsDir, 0o755); err != nil {
		return nil, err
	}
	inputs := make([]jobs.InputFile, 0, len(parts))
	for _, part := range parts {
		src, err := part.Header.Open()
		if err != nil {
			return nil, err
		}
		defer src.Close()
		name := safeFilename(part.Filename)
		if name == "" {
			return nil, fmt.Errorf("invalid input filename")
		}
		dstPath := filepath.Join(paths.InputsDir, name)
		dst, err := os.Create(dstPath)
		if err != nil {
			return nil, err
		}
		size, copyErr := io.Copy(dst, src)
		closeErr := dst.Close()
		if copyErr != nil {
			return nil, copyErr
		}
		if closeErr != nil {
			return nil, closeErr
		}
		inputs = append(inputs, jobs.InputFile{
			Name:        name,
			ContentType: detectContentType(r, part.Field, name),
			Size:        size,
			Path:        dstPath,
		})
	}
	return inputs, nil
}

func detectContentType(r *http.Request, field string, fallbackName string) string {
	if r.MultipartForm == nil {
		return "application/octet-stream"
	}
	for _, header := range r.MultipartForm.File[field] {
		if safeFilename(header.Filename) == fallbackName {
			if value := header.Header.Get("content-type"); value != "" {
				return value
			}
		}
	}
	return "application/octet-stream"
}

func (s *Server) getArtifact(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	name := safeFilename(chi.URLParam(r, "artifact"))
	job, err := s.store.Get(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "job not found")
		return
	}
	var artifact *jobs.Artifact
	for _, item := range job.Artifacts {
		if item.Name == name {
			copy := item
			artifact = &copy
			break
		}
	}
	if artifact == nil {
		writeError(w, http.StatusNotFound, "artifact not found")
		return
	}
	path := s.store.ArtifactPath(id, name)
	w.Header().Set("content-type", artifact.ContentType)
	http.ServeFile(w, r, path)
}

func (s *Server) withArtifactURLs(in []jobs.Job) []jobs.Job {
	out := make([]jobs.Job, 0, len(in))
	for _, job := range in {
		out = append(out, s.withArtifactURL(job))
	}
	return out
}

func (s *Server) withArtifactURL(job jobs.Job) jobs.Job {
	for i := range job.Artifacts {
		job.Artifacts[i].URL = strings.TrimRight(s.cfg.PublicBaseURL, "/") + "/api/v1/jobs/" + job.ID + "/artifacts/" + job.Artifacts[i].Name
	}
	return job
}

func safeFilename(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	if base == "." || base == "/" || base == "" {
		return ""
	}
	base = strings.ReplaceAll(base, string(filepath.Separator), "_")
	return base
}
