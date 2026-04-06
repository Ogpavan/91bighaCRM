begin;

create table if not exists roles (
  id bigserial primary key,
  name varchar(60) not null unique,
  slug varchar(80) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists permissions (
  id bigserial primary key,
  permission_key varchar(80) not null unique,
  description varchar(255),
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  role_id bigint not null references roles(id) on delete cascade,
  permission_id bigint not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists teams (
  id bigserial primary key,
  name varchar(120) not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_permissions (
  team_id bigint not null references teams(id) on delete cascade,
  permission_id bigint not null references permissions(id) on delete cascade,
  primary key (team_id, permission_id)
);

alter table users
  add column if not exists role_id bigint,
  add column if not exists team_id bigint;

insert into roles (name, slug)
values
  ('Admin', 'admin'),
  ('SalesManager', 'sales-manager'),
  ('SalesExecutive', 'sales-executive')
on conflict (slug) do nothing;

insert into permissions (permission_key, description)
values
  ('view_dashboard', 'View CRM dashboard'),
  ('view_leads', 'View leads'),
  ('create_leads', 'Create leads'),
  ('edit_leads', 'Edit leads'),
  ('view_tasks', 'View tasks'),
  ('create_tasks', 'Create tasks'),
  ('edit_tasks', 'Edit tasks'),
  ('delete_tasks', 'Delete tasks'),
  ('view_users', 'View users'),
  ('manage_users', 'Manage users'),
  ('view_reports', 'View reports'),
  ('manage_settings', 'Manage settings')
on conflict (permission_key) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on (
  (r.slug = 'admin' and p.permission_key in (
    'view_dashboard', 'view_leads', 'create_leads', 'edit_leads',
    'view_tasks', 'create_tasks', 'edit_tasks', 'delete_tasks',
    'view_users', 'manage_users', 'view_reports', 'manage_settings'
  ))
  or
  (r.slug = 'sales-manager' and p.permission_key in (
    'view_dashboard', 'view_leads', 'create_leads', 'edit_leads',
    'view_tasks', 'create_tasks', 'edit_tasks',
    'view_users', 'view_reports'
  ))
  or
  (r.slug = 'sales-executive' and p.permission_key in (
    'view_dashboard', 'view_leads', 'create_leads', 'edit_leads',
    'view_tasks', 'create_tasks', 'edit_tasks'
  ))
)
on conflict do nothing;

update users u
set role_id = r.id
from roles r
where u.role_id is null
  and lower(coalesce(u.role, '')) = lower(r.name);

update users
set role_id = (select id from roles where slug = 'sales-executive')
where role_id is null;

alter table users
  alter column role_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_role_id_fkey'
  ) then
    alter table users
      add constraint users_role_id_fkey
      foreign key (role_id) references roles(id) on delete restrict;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_team_id_fkey'
  ) then
    alter table users
      add constraint users_team_id_fkey
      foreign key (team_id) references teams(id) on delete set null;
  end if;
end $$;

create index if not exists idx_users_role_id_active on users(role_id, is_active);
create index if not exists idx_users_team_id on users(team_id);
create index if not exists idx_role_permissions_permission on role_permissions(permission_id);
create index if not exists idx_team_permissions_permission on team_permissions(permission_id);

commit;
