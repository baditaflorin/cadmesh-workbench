package jobs

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStoreCreatesAndPersistsJobs(t *testing.T) {
	store, err := NewStore(t.TempDir())
	require.NoError(t, err)

	job, err := store.Create(JobRequest{
		Workflow: WorkflowMeshRepair,
		Name:     "repair demo",
	})
	require.NoError(t, err)
	require.NotEmpty(t, job.ID)

	reloaded, err := NewStore(store.dataDir)
	require.NoError(t, err)
	got, err := reloaded.Get(job.ID)
	require.NoError(t, err)
	require.Equal(t, WorkflowMeshRepair, got.Workflow)
}
