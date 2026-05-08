package httpapi

import (
	"encoding/json"
	"net/http"
)

type problem struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, problem{Error: message})
}
