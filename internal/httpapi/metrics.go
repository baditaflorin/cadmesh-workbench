package httpapi

import (
	"net/http"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Metrics struct {
	registry     *prometheus.Registry
	httpRequests *prometheus.CounterVec
	httpDuration *prometheus.HistogramVec
	httpInflight prometheus.Gauge
	jobSubmitted *prometheus.CounterVec
	jobCompleted *prometheus.CounterVec
	jobDuration  *prometheus.HistogramVec
	toolGauge    *prometheus.GaugeVec
}

func NewMetrics() *Metrics {
	registry := prometheus.NewRegistry()
	m := &Metrics{
		registry: registry,
		httpRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "cadmesh_http_requests_total",
			Help: "Total HTTP requests by method, route, and status.",
		}, []string{"method", "route", "status"}),
		httpDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "cadmesh_http_request_duration_seconds",
			Help:    "HTTP request latency by method and route.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route"}),
		httpInflight: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "cadmesh_http_requests_in_flight",
			Help: "Current in-flight HTTP requests.",
		}),
		jobSubmitted: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "cadmesh_jobs_submitted_total",
			Help: "Submitted jobs by workflow.",
		}, []string{"workflow"}),
		jobCompleted: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "cadmesh_jobs_completed_total",
			Help: "Completed jobs by workflow and status.",
		}, []string{"workflow", "status"}),
		jobDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "cadmesh_job_duration_seconds",
			Help:    "Job execution duration by workflow and status.",
			Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2, 5, 15, 60, 300, 900},
		}, []string{"workflow", "status"}),
		toolGauge: prometheus.NewGaugeVec(prometheus.GaugeOpts{
			Name: "cadmesh_native_tool_available",
			Help: "Native tool availability, 1 when available.",
		}, []string{"tool"}),
	}

	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		m.httpRequests,
		m.httpDuration,
		m.httpInflight,
		m.jobSubmitted,
		m.jobCompleted,
		m.jobDuration,
		m.toolGauge,
	)
	return m
}

func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.registry, promhttp.HandlerOpts{})
}

func (m *Metrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		m.httpInflight.Inc()
		defer m.httpInflight.Dec()
		next.ServeHTTP(recorder, r)

		route := r.URL.Path
		m.httpRequests.WithLabelValues(r.Method, route, strconv.Itoa(recorder.status)).Inc()
		m.httpDuration.WithLabelValues(r.Method, route).Observe(time.Since(started).Seconds())
	})
}

func (m *Metrics) JobSubmitted(workflow string) {
	m.jobSubmitted.WithLabelValues(workflow).Inc()
}

func (m *Metrics) JobCompleted(workflow string, status string, duration time.Duration) {
	m.jobCompleted.WithLabelValues(workflow, status).Inc()
	m.jobDuration.WithLabelValues(workflow, status).Observe(duration.Seconds())
}

func (m *Metrics) SetToolAvailable(tool string, available bool) {
	value := 0.0
	if available {
		value = 1.0
	}
	m.toolGauge.WithLabelValues(tool).Set(value)
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
