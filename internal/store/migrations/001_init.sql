-- non-overlapping, sequential spans of the currently focused window & app
create table span
(
    id           integer primary key autoincrement,
    app_name     text    not null,
    window_title text    not null,
    start_at     integer not null, -- Unix timestamp
    end_at       integer not null  -- Unix timestamp
);

create index idx_start_at on span (start_at);
create index idx_end_at on span (end_at);


create table category
(
    id    integer primary key autoincrement,
    name  text not null unique,
    color text not null -- Tailwind class or hex
);

create table project
(
    id    integer primary key autoincrement,
    name  text not null unique,
    color text not null -- Tailwind class or hex
);

-- Rules for mapping activity to projects
create table project_rule
(
    id         integer primary key autoincrement,
    pattern    text    not null, -- Regex pattern
    project_id integer not null,
    is_active  BOOLEAN not null default 1,
    foreign key (project_id) references project (id) on delete cascade
);

-- Rules for mapping activity to categories
create table category_rule
(
    id          integer primary key autoincrement,
    pattern     text    not null, -- Regex pattern
    category_id integer not null,
    is_active   BOOLEAN not null default 1,
    foreign key (category_id) references category (id) on delete cascade
);

-- Insert some default categories
insert into category (name, color)
values ('Development', 'bg-emerald-500'),
       ('Communication', 'bg-blue-500'),
       ('Browsing', 'bg-neutral-500'),
       ('Design', 'bg-purple-500'),
       ('Meeting', 'bg-yellow-500');
