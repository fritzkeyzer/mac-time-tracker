package web_ui

import (
	"context"
	"fmt"
	"regexp"
	"slices"
	"sort"
	"time"

	"github.com/fritzkeyzer/mac-time-tracker/internal/store"
)

type GetTimelineRequest struct {
	Start int64 `json:"from"`
	End   int64 `json:"to"`
}

type TimelineSpan struct {
	Span       store.Span       `json:"span"`
	Categories []store.Category `json:"categories,omitempty"`
	Projects   []store.Project  `json:"projects,omitempty"`
}

type GetTimelineResponse struct {
	Spans []TimelineSpan `json:"spans"`
}

func (s *Server) handleGetTimeline(ctx context.Context, in GetTimelineRequest) (*GetTimelineResponse, error) {
	start := in.Start
	end := in.End

	// Apply defaults if not provided
	if start == 0 {
		start = time.Now().Truncate(24 * time.Hour).Unix()
	}
	if end == 0 {
		end = time.Now().AddDate(0, 0, 1).Truncate(24 * time.Hour).Unix()
	}

	spans, err := s.db.SelectSpans(ctx, store.SelectSpansParams{
		StartAt: start,
		EndAt:   end,
	})
	if err != nil {
		return nil, fmt.Errorf("select spans: %w", err)
	}

	projectRules, err := s.db.SelectProjectRules(ctx)
	if err != nil {
		return nil, fmt.Errorf("select project rules: %w", err)
	}
	categoryRules, err := s.db.SelectCategoryRules(ctx)
	if err != nil {
		return nil, fmt.Errorf("select category rules: %w", err)
	}

	data := &GetTimelineResponse{}

	for _, span := range spans {
		data.Spans = append(data.Spans, TimelineSpan{
			Span: span,
		})
	}
	for _, rule := range projectRules {
		if !rule.IsActive {
			continue
		}
		re := regexp.MustCompile(rule.Pattern)
		for i := range data.Spans {
			if slices.ContainsFunc(data.Spans[i].Projects, func(project store.Project) bool {
				return project.ID == rule.ProjectID
			}) {
				continue
			}
			if re.MatchString(data.Spans[i].Span.AppName + " " + data.Spans[i].Span.WindowTitle) {
				data.Spans[i].Projects = append(data.Spans[i].Projects, store.Project{
					ID:    rule.ProjectID,
					Name:  rule.Name,
					Color: rule.Color,
				})
			}
		}
	}
	for _, rule := range categoryRules {
		if !rule.IsActive {
			continue
		}
		re := regexp.MustCompile(rule.Pattern)
		for i := range data.Spans {
			if slices.ContainsFunc(data.Spans[i].Categories, func(category store.Category) bool {
				return category.ID == rule.CategoryID
			}) {
				continue
			}
			if re.MatchString(data.Spans[i].Span.AppName + " " + data.Spans[i].Span.WindowTitle) {
				data.Spans[i].Categories = append(data.Spans[i].Categories, store.Category{
					ID:    rule.CategoryID,
					Name:  rule.Name,
					Color: rule.Color,
				})
			}
		}
	}

	return data, nil
}

type GetOverviewRequest struct {
	Start int64 `json:"start"`
	End   int64 `json:"end"`
}

type AppOverview struct {
	Name         string       `json:"name"`
	Spans        []store.Span `json:"spans"`
	TotalSeconds int64        `json:"total_seconds"`
}

type ProjectOverview struct {
	Project      store.Project `json:"project"`
	Spans        []store.Span  `json:"spans"`
	TotalSeconds int64         `json:"total_seconds"`
}

type CategoryOverview struct {
	Category     store.Category `json:"category"`
	Spans        []store.Span   `json:"spans"`
	TotalSeconds int64          `json:"total_seconds"`
}

type GetOverviewResponse struct {
	TotalSeconds int64              `json:"total_seconds"`
	Apps         []AppOverview      `json:"apps"`
	Projects     []ProjectOverview  `json:"projects"`
	Categories   []CategoryOverview `json:"categories"`
}

func (s *Server) handleGetOverview(ctx context.Context, in GetOverviewRequest) (*GetOverviewResponse, error) {
	timelineData, err := s.handleGetTimeline(ctx, GetTimelineRequest{
		Start: in.Start,
		End:   in.End,
	})
	if err != nil {
		return nil, fmt.Errorf("get timeline data: %w", err)
	}

	// Calculate total time
	var totalSeconds int64
	for _, ts := range timelineData.Spans {
		totalSeconds += ts.Span.EndAt - ts.Span.StartAt
	}

	// Group by app
	appMap := make(map[string]*AppOverview)
	for _, ts := range timelineData.Spans {
		if _, ok := appMap[ts.Span.AppName]; !ok {
			appMap[ts.Span.AppName] = &AppOverview{
				Name:  ts.Span.AppName,
				Spans: []store.Span{},
			}
		}
		appMap[ts.Span.AppName].Spans = append(appMap[ts.Span.AppName].Spans, ts.Span)
		appMap[ts.Span.AppName].TotalSeconds += ts.Span.EndAt - ts.Span.StartAt
	}

	// Group by project (a span can have multiple projects)
	projectMap := make(map[int64]*ProjectOverview)
	for _, ts := range timelineData.Spans {
		for _, proj := range ts.Projects {
			if _, ok := projectMap[proj.ID]; !ok {
				projectMap[proj.ID] = &ProjectOverview{
					Project: proj,
					Spans:   []store.Span{},
				}
			}
			projectMap[proj.ID].Spans = append(projectMap[proj.ID].Spans, ts.Span)
			projectMap[proj.ID].TotalSeconds += ts.Span.EndAt - ts.Span.StartAt
		}
	}

	// Group by category (a span can have multiple categories)
	categoryMap := make(map[int64]*CategoryOverview)
	for _, ts := range timelineData.Spans {
		for _, cat := range ts.Categories {
			if _, ok := categoryMap[cat.ID]; !ok {
				categoryMap[cat.ID] = &CategoryOverview{
					Category: cat,
					Spans:    []store.Span{},
				}
			}
			categoryMap[cat.ID].Spans = append(categoryMap[cat.ID].Spans, ts.Span)
			categoryMap[cat.ID].TotalSeconds += ts.Span.EndAt - ts.Span.StartAt
		}
	}

	// Convert maps to slices
	apps := make([]AppOverview, 0, len(appMap))
	for _, app := range appMap {
		apps = append(apps, *app)
	}

	projects := make([]ProjectOverview, 0, len(projectMap))
	for _, proj := range projectMap {
		projects = append(projects, *proj)
	}

	categories := make([]CategoryOverview, 0, len(categoryMap))
	for _, cat := range categoryMap {
		categories = append(categories, *cat)
	}

	sort.Slice(apps, func(i, j int) bool {
		return apps[i].TotalSeconds > apps[j].TotalSeconds
	})
	sort.Slice(projects, func(i, j int) bool {
		return projects[i].TotalSeconds > projects[j].TotalSeconds
	})
	sort.Slice(categories, func(i, j int) bool {
		return categories[i].TotalSeconds > categories[j].TotalSeconds
	})

	return &GetOverviewResponse{
		TotalSeconds: totalSeconds,
		Apps:         apps,
		Projects:     projects,
		Categories:   categories,
	}, nil
}
