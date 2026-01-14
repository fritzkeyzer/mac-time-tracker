package web_ui

import (
	"compress/gzip"
	"context"
	"embed"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os/exec"
	"strings"

	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
	"github.com/fritzkeyzer/mac-time-tracker/pkg/rest"
)

//go:embed static/*
var content embed.FS

type Server struct {
	db   *store.Queries
	port string
}

func NewServer(db *store.Queries, port string) *Server {
	return &Server{
		db:   db,
		port: port,
	}
}

func (s *Server) Start(ctx context.Context) error {
	mux := http.NewServeMux()

	// Static File Endpoints (embedded VueJS app)
	mux.Handle("/", gz(http.FileServer(s.staticFS())))

	// Span Endpoints
	mux.Handle("/api/timeline", gz(rest.WrapJSONInOut(s.handleGetTimeline)))
	mux.Handle("/api/overview", gz(rest.WrapJSONInOut(s.handleGetOverview)))

	// Category Endpoints
	mux.Handle("/api/categories", gz(rest.WrapJSONOut(s.handleGetCategories)))
	mux.Handle("/api/categories/save", gz(rest.WrapJSONInOut(s.handleSaveCategory)))
	mux.Handle("/api/categories/delete", gz(rest.WrapJSONIn(s.handleDeleteCategory)))
	mux.Handle("/api/categories/rules/save", gz(rest.WrapJSONInOut(s.handleSaveCategoryRule)))
	mux.Handle("/api/categories/rules/delete", gz(rest.WrapJSONIn(s.handleDeleteCategoryRule)))

	// Project Endpoints
	mux.Handle("/api/projects", gz(rest.WrapJSONOut(s.handleGetProjects)))
	mux.Handle("/api/projects/save", gz(rest.WrapJSONInOut(s.handleSaveProject)))
	mux.Handle("/api/projects/delete", gz(rest.WrapJSONIn(s.handleDeleteProject)))
	mux.Handle("/api/projects/rules/save", gz(rest.WrapJSONInOut(s.handleSaveProjectRule)))
	mux.Handle("/api/projects/rules/delete", gz(rest.WrapJSONIn(s.handleDeleteProjectRule)))

	addr := ":" + s.port
	slog.Info("Starting web server", "addr", addr)

	// Open browser
	url := fmt.Sprintf("http://localhost%s/index.html", addr)
	if err := exec.Command("open", url).Start(); err != nil {
		slog.Warn("Failed to open browser", "error", err)
	}

	return http.ListenAndServe(addr, mux)
}

// gzipResponseWriter wraps http.ResponseWriter to compress responses
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

// gz wraps handlers to add gzip compression
func gz(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if client accepts gzip
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Set gzip headers
		w.Header().Set("Content-Encoding", "gzip")

		// Create gzip writer
		gz := gzip.NewWriter(w)
		defer gz.Close()

		// Wrap response writer
		gzw := gzipResponseWriter{Writer: gz, ResponseWriter: w}
		next.ServeHTTP(gzw, r)
	})
}
