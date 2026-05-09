package jobs

import "os/exec"

type Tool struct {
	Name      string `json:"name"`
	Binary    string `json:"binary"`
	Purpose   string `json:"purpose"`
	Available bool   `json:"available"`
	Path      string `json:"path,omitempty"`
}

func DetectTools() []Tool {
	specs := []Tool{
		{Name: "OpenCascade/OCCT", Binary: "DRAWEXE", Purpose: "B-rep CAD inspection and kernel-backed operations"},
		{Name: "MeshLab", Binary: "meshlabserver", Purpose: "mesh inspection, cleanup, and decimation"},
		{Name: "COLMAP", Binary: "colmap", Purpose: "structure-from-motion reconstruction"},
		{Name: "OpenMVS", Binary: "ReconstructMesh", Purpose: "dense reconstruction and mesh generation"},
		{Name: "Open3D", Binary: "open3d", Purpose: "mesh cleanup, normals, simplification, and conversion"},
		{Name: "Blender", Binary: "blender", Purpose: "bmesh cleanup and glTF conversion fallback"},
		{Name: "Draco", Binary: "draco_encoder", Purpose: "glTF mesh compression"},
	}

	for i := range specs {
		path, err := exec.LookPath(specs[i].Binary)
		if err == nil {
			specs[i].Available = true
			specs[i].Path = path
		}
	}

	return specs
}

func ToolAvailabilityMap(tools []Tool) map[string]bool {
	out := make(map[string]bool, len(tools))
	for _, tool := range tools {
		out[tool.Name] = tool.Available
	}
	return out
}
