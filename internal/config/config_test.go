package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSplitCSVTrimsEmptyValues(t *testing.T) {
	require.Equal(t, []string{"a", "b"}, splitCSV(" a, ,b "))
}
