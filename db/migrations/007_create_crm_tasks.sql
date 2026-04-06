create table if not exists crm_tasks (
  id bigserial primary key,
  title varchar(220) not null,
  description text,
  task_type varchar(80) not null,
  status varchar(40) not null default 'Pending',
  priority varchar(40) not null default 'Medium',
  due_date timestamptz,
  completed_at timestamptz,
  assigned_to bigint not null references users(id) on delete restrict,
  created_by bigint not null references users(id) on delete restrict,
  lead_id bigint references crm_leads(id) on delete set null,
  project_id bigint references properties(id) on delete set null,
  booking_id bigint,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_tasks_assigned_to on crm_tasks(assigned_to) where is_deleted = false;
create index if not exists idx_crm_tasks_created_by on crm_tasks(created_by) where is_deleted = false;
create index if not exists idx_crm_tasks_status on crm_tasks(status) where is_deleted = false;
create index if not exists idx_crm_tasks_due_date on crm_tasks(due_date) where is_deleted = false;
create index if not exists idx_crm_tasks_lead_id on crm_tasks(lead_id) where is_deleted = false;
create index if not exists idx_crm_tasks_project_id on crm_tasks(project_id) where is_deleted = false;

create table if not exists crm_task_activities (
  id bigserial primary key,
  task_id bigint not null references crm_tasks(id) on delete cascade,
  activity_type varchar(60) not null,
  activity_text text not null,
  meta jsonb,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_task_activities_task_id on crm_task_activities(task_id, created_at desc);
