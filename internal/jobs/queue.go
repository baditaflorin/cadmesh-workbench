package jobs

import (
	"context"
	"log/slog"
	"time"
)

type Observer interface {
	JobSubmitted(workflow string)
	JobCompleted(workflow string, status string, duration time.Duration)
}

type Queue struct {
	store    *Store
	pipeline *Pipeline
	observer Observer
	logger   *slog.Logger
	jobs     chan string
}

func NewQueue(store *Store, pipeline *Pipeline, observer Observer, logger *slog.Logger, capacity int) *Queue {
	if capacity <= 0 {
		capacity = 1
	}
	return &Queue{
		store:    store,
		pipeline: pipeline,
		observer: observer,
		logger:   logger,
		jobs:     make(chan string, capacity),
	}
}

func (q *Queue) Start(ctx context.Context) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case id := <-q.jobs:
				q.run(ctx, id)
			}
		}
	}()
}

func (q *Queue) Enqueue(id string) {
	q.jobs <- id
}

func (q *Queue) run(ctx context.Context, id string) {
	started := time.Now().UTC()
	job, err := q.store.Update(id, func(job *Job) {
		job.Status = StatusRunning
		job.StartedAt = &started
		job.Error = ""
	})
	if err != nil {
		q.logger.Error("failed to mark job running", "job_id", id, "error", err)
		return
	}

	result, err := q.pipeline.Run(ctx, *job, q.store.Paths(id))
	finished := time.Now().UTC()
	status := StatusSucceeded
	errMsg := ""
	if err != nil {
		status = StatusFailed
		errMsg = err.Error()
	}

	_, updateErr := q.store.Update(id, func(job *Job) {
		job.Status = status
		job.FinishedAt = &finished
		job.Artifacts = result.Artifacts
		job.Logs = append(job.Logs, result.Logs...)
		job.ResultMode = result.ResultMode
		job.Warnings = append([]string(nil), result.Warnings...)
		job.Error = errMsg
	})
	if updateErr != nil {
		q.logger.Error("failed to persist job result", "job_id", id, "error", updateErr)
	}
	if q.observer != nil {
		q.observer.JobCompleted(string(job.Workflow), string(status), finished.Sub(started))
	}
}
