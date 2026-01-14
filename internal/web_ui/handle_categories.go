package web_ui

import (
	"context"
	"fmt"

	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
)

type GetCategoriesResponse struct {
	Categories    []store.Category               `json:"categories"`
	CategoryRules []store.SelectCategoryRulesRow `json:"category_rules"`
}

func (s *Server) handleGetCategories(ctx context.Context) (*GetCategoriesResponse, error) {
	categories, err := s.db.SelectCategories(ctx)
	if err != nil {
		return nil, fmt.Errorf("select categories: %w", err)
	}

	categoryRules, err := s.db.SelectCategoryRules(ctx)
	if err != nil {
		return nil, fmt.Errorf("select category rules: %w", err)
	}

	return &GetCategoriesResponse{
		Categories:    categories,
		CategoryRules: categoryRules,
	}, nil
}

func (s *Server) handleSaveCategory(ctx context.Context, in store.Category) (*store.Category, error) {
	if in.ID > 0 {
		if _, err := s.db.UpdateCategory(ctx, store.UpdateCategoryParams{
			Name:  in.Name,
			Color: in.Color,
			ID:    in.ID,
		}); err != nil {
			return nil, fmt.Errorf("update category: %w", err)
		}
		return &in, nil
	}

	cat, err := s.db.InsertCategory(ctx, store.InsertCategoryParams{
		Name:  in.Name,
		Color: in.Color,
	})
	if err != nil {
		return nil, fmt.Errorf("insert category: %w", err)
	}

	in.ID = cat.ID
	return &in, nil
}

type DeleteCategoryRequest struct {
	ID int64 `json:"id"`
}

func (s *Server) handleDeleteCategory(ctx context.Context, in DeleteCategoryRequest) error {
	if err := s.db.DeleteCategory(ctx, in.ID); err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	return nil
}

func (s *Server) handleSaveCategoryRule(ctx context.Context, in store.CategoryRule) (*store.CategoryRule, error) {
	if in.ID > 0 {
		if _, err := s.db.UpdateCategoryRule(ctx, store.UpdateCategoryRuleParams{
			Pattern:    in.Pattern,
			CategoryID: in.CategoryID,
			IsActive:   in.IsActive,
			ID:         in.ID,
		}); err != nil {
			return nil, fmt.Errorf("update category rule: %w", err)
		}
		return &in, nil
	}

	cRule, err := s.db.InsertCategoryRule(ctx, store.InsertCategoryRuleParams{
		Pattern:    in.Pattern,
		CategoryID: in.CategoryID,
		IsActive:   in.IsActive,
	})
	if err != nil {
		return nil, fmt.Errorf("insert category rule: %w", err)
	}

	in.ID = cRule.ID
	return &in, nil
}

type DeleteCategoryRuleRequest struct {
	ID int64 `json:"id"`
}

func (s *Server) handleDeleteCategoryRule(ctx context.Context, in DeleteCategoryRuleRequest) error {
	if err := s.db.DeleteCategoryRule(ctx, in.ID); err != nil {
		return fmt.Errorf("delete category rule: %w", err)
	}
	return nil
}
