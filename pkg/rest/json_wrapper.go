package rest

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gobigbang/binder"
)

// WrapJSONInOut wraps a regular Go function with HTTP request handling.
func WrapJSONInOut[I, O any](fn func(ctx context.Context, in I) (*O, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input I
		if err := binder.BindHttp(r, &input); err != nil {
			slog.Error("Invalid request", "error", err, "url", r.URL.String())
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		output, err := fn(r.Context(), input)
		if err != nil {
			slog.Error("Internal error", "error", err, "url", r.URL.String(), "input", input)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(output)
	}
}

// WrapJSONIn wraps a regular Go function with HTTP request handling.
func WrapJSONIn[I any](fn func(ctx context.Context, in I) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input I
		if err := binder.BindHttp(r, &input); err != nil {
			slog.Error("Invalid request", "error", err, "url", r.URL.String())
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := fn(r.Context(), input); err != nil {
			slog.Error("Internal error", "error", err, "url", r.URL.String(), "input", input)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}

// WrapJSONOut wraps a regular Go function with HTTP request handling.
func WrapJSONOut[O any](fn func(ctx context.Context) (*O, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		output, err := fn(r.Context())
		if err != nil {
			slog.Error("Internal error", "error", err, "url", r.URL.String())
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(output)
	}
}

// WrapJSONNone wraps a regular Go function with HTTP request handling.
func WrapJSONNone(fn func(ctx context.Context) error) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := fn(r.Context()); err != nil {
			slog.Error("Internal error", "error", err, "url", r.URL.String())
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}
}
