begin;

create table if not exists projects (
  id bigserial primary key,
  project_code varchar(60) not null unique,
  name varchar(180) not null,
  slug varchar(220) not null unique,
  location varchar(180),
  status varchar(30) not null default 'active',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table properties
  add column if not exists project_id bigint references projects(id) on delete set null;

create index if not exists idx_projects_status on projects(status);
create index if not exists idx_projects_name on projects(lower(name));
create index if not exists idx_properties_project_id on properties(project_id);

commit;
