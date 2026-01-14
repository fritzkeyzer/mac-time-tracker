package web_ui

import (
	"io/fs"
	"log/slog"
	"net/http"
	"os"
)

func (s *Server) staticFS() http.FileSystem {
	var staticFS http.FileSystem

	// Check live reload
	if os.Getenv("LIVE") == "true" {
		slog.Debug("Using live mode")
		staticFS = http.Dir("./internal/web_ui/static")
	} else {
		sub, err := fs.Sub(content, "static")
		if err != nil {
			slog.Error("Failed to load embedded static assets", "error", err)
		}
		staticFS = http.FS(sub)
	}
	
	return staticFS
}
