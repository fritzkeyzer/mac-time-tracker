package web_ui

import (
	"context"
	"fmt"

	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
)

type GetProjectsResponse struct {
	Projects     []store.Project               `json:"projects"`
	ProjectRules []store.SelectProjectRulesRow `json:"project_rules"`
}

func (s *Server) handleGetProjects(ctx context.Context) (*GetProjectsResponse, error) {
	projects, err := s.db.SelectProjects(ctx)
	if err != nil {
		return nil, fmt.Errorf("select projects: %w", err)
	}

	projectRules, err := s.db.SelectProjectRules(ctx)
	if err != nil {
		return nil, fmt.Errorf("select project rules: %w", err)
	}

	return &GetProjectsResponse{
		Projects:     projects,
		ProjectRules: projectRules,
	}, nil
}

func (s *Server) handleSaveProject(ctx context.Context, in store.Project) (*store.Project, error) {
	if in.ID > 0 {
		if _, err := s.db.UpdateProject(ctx, store.UpdateProjectParams{
			Name:  in.Name,
			Color: in.Color,
			ID:    in.ID,
		}); err != nil {
			return nil, fmt.Errorf("update project: %w", err)
		}
		return &in, nil
	}

	cat, err := s.db.InsertProject(ctx, store.InsertProjectParams{
		Name:  in.Name,
		Color: in.Color,
	})
	if err != nil {
		return nil, fmt.Errorf("insert project: %w", err)
	}

	in.ID = cat.ID
	return &in, nil
}

type DeleteProjectRequest struct {
	ID int64 `json:"id"`
}

func (s *Server) handleDeleteProject(ctx context.Context, in DeleteProjectRequest) error {
	if err := s.db.DeleteProject(ctx, in.ID); err != nil {
		return fmt.Errorf("delete project: %w", err)
	}
	return nil
}

func (s *Server) handleSaveProjectRule(ctx context.Context, in store.ProjectRule) (*store.ProjectRule, error) {
	if in.ID > 0 {
		if _, err := s.db.UpdateProjectRule(ctx, store.UpdateProjectRuleParams{
			Pattern:   in.Pattern,
			ProjectID: in.ProjectID,
			IsActive:  in.IsActive,
			ID:        in.ID,
		}); err != nil {
			return nil, fmt.Errorf("update project rule: %w", err)
		}
		return &in, nil
	}

	pRule, err := s.db.InsertProjectRule(ctx, store.InsertProjectRuleParams{
		Pattern:   in.Pattern,
		ProjectID: in.ProjectID,
		IsActive:  in.IsActive,
	})
	if err != nil {
		return nil, fmt.Errorf("insert project rule: %w", err)
	}

	in.ID = pRule.ID
	return &in, nil
}

type DeleteProjectRuleRequest struct {
	ID int64 `json:"id"`
}

func (s *Server) handleDeleteProjectRule(ctx context.Context, in DeleteProjectRuleRequest) error {
	if err := s.db.DeleteProjectRule(ctx, in.ID); err != nil {
		return fmt.Errorf("delete project rule: %w", err)
	}
	return nil
}
