-----------------------------------------
-- Spans
-----------------------------------------

-- name: SelectLatestSpan :one
select *
from span
order by start_at desc
limit 1;

-- name: InsertSpan :one
insert into span(app_name, window_title, start_at, end_at)
values (@app_name, @window_title, @start_at, @end_at)
returning *;

-- name: UpdateSpan :one
update span
set end_at = @end_at
where id = @id
returning *;

-- name: SelectSpans :many
select *
from span
where start_at > @start_at
  and end_at < @end_at;

-- name: SelectCategorySpans :many
with rule as ( select * from category_rule where category_rule.id = @category_id )
select *
from span
where regexp_like(app_name, rule.pattern)
   or regexp_like(window_title, rule.pattern)
limit sqlc.arg('limit');


-----------------------------------------
-- Categories
-----------------------------------------

-- name: InsertCategory :one
insert into category (name, color)
values (@name, @color)
returning *;

-- name: UpdateCategory :one
update category
set name  = @name,
    color = @color
where id = @id
returning *;

-- name: DeleteCategory :exec
delete
from category
where id = @id;

-- name: SelectCategories :many
select *
from category
order by id;

-----------------------------------------
-- Projects
-----------------------------------------

-- name: InsertProject :one
insert into project (name, color)
values (@name, @color)
returning *;

-- name: UpdateProject :one
update project
set name  = @name,
    color = @color
where id = @id
returning *;

-- name: DeleteProject :exec
delete
from project
where id = @id;

-- name: SelectProjects :many
select *
from project
order by id;

-----------------------------------------
-- Category Rules
-----------------------------------------

-- name: InsertCategoryRule :one
insert into category_rule (pattern, category_id, is_active)
values (@pattern, @category_id, @is_active)
returning *;

-- name: UpdateCategoryRule :one
update category_rule
set pattern     = @pattern,
    category_id = @category_id,
    is_active   = @is_active
where id = @id
returning *;

-- name: DeleteCategoryRule :exec
delete
from category_rule
where id = @id;

-- name: SelectCategoryRules :many
select cr.id, cr.pattern, cr.category_id, cr.is_active, c.name, c.color
from category_rule cr
         join category c on cr.category_id = c.id
order by c.id, cr.id;

-----------------------------------------
-- Project Rules
-----------------------------------------

-- name: InsertProjectRule :one
insert into project_rule (pattern, project_id, is_active)
values (@pattern, @project_id, @is_active)
returning *;

-- name: UpdateProjectRule :one
update project_rule
set pattern    = @pattern,
    project_id = @project_id,
    is_active  = @is_active
where id = @id
returning *;

-- name: DeleteProjectRule :exec
delete
from project_rule
where id = @id;

-- name: SelectProjectRules :many
select pr.id, pr.pattern, pr.project_id, pr.is_active, p.name, p.color
from project_rule pr
         join project p on pr.project_id = p.id
order by p.id, pr.id;