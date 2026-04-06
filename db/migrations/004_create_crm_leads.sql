begin;

create table if not exists crm_lead_statuses (
  id bigserial primary key,
  name varchar(80) not null unique,
  slug varchar(80) not null unique,
  sort_order integer not null default 0,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists crm_lead_sources (
  id bigserial primary key,
  name varchar(120) not null unique,
  slug varchar(120) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists crm_leads (
  id bigserial primary key,
  name varchar(180) not null,
  phone varchar(30) not null,
  email varchar(180),
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  property_type varchar(80),
  preferred_location varchar(180),
  project_id bigint references properties(id) on delete set null,
  source_id bigint not null references crm_lead_sources(id) on delete restrict,
  status_id bigint not null references crm_lead_statuses(id) on delete restrict,
  priority varchar(20) not null default 'Medium',
  assigned_to bigint references users(id) on delete set null,
  created_by bigint not null references users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create table if not exists crm_lead_followups (
  id bigserial primary key,
  lead_id bigint not null references crm_leads(id) on delete cascade,
  type varchar(50) not null,
  notes text,
  next_follow_up_date timestamptz,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists crm_lead_visits (
  id bigserial primary key,
  lead_id bigint not null references crm_leads(id) on delete cascade,
  visit_date timestamptz not null,
  project_id bigint references properties(id) on delete set null,
  unit_id varchar(120),
  feedback text,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists crm_lead_activities (
  id bigserial primary key,
  lead_id bigint not null references crm_leads(id) on delete cascade,
  activity_type varchar(50) not null,
  activity_text text not null,
  meta_json jsonb,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_leads_status_created on crm_leads(status_id, created_at desc);
create index if not exists idx_crm_leads_source_created on crm_leads(source_id, created_at desc);
create index if not exists idx_crm_leads_assigned_created on crm_leads(assigned_to, created_at desc);
create index if not exists idx_crm_leads_project on crm_leads(project_id);
create index if not exists idx_crm_leads_search on crm_leads(lower(name), phone, lower(coalesce(email, '')));
create index if not exists idx_crm_lead_followups_lead_created on crm_lead_followups(lead_id, created_at desc);
create index if not exists idx_crm_lead_visits_lead_created on crm_lead_visits(lead_id, created_at desc);
create index if not exists idx_crm_lead_activities_lead_created on crm_lead_activities(lead_id, created_at desc);

insert into crm_lead_statuses (name, slug, sort_order, is_terminal)
values
  ('New', 'new', 1, false),
  ('Contacted', 'contacted', 2, false),
  ('Qualified', 'qualified', 3, false),
  ('Site Visit Scheduled', 'site-visit-scheduled', 4, false),
  ('Negotiation', 'negotiation', 5, false),
  ('Booking Confirmed', 'booking-confirmed', 6, true),
  ('Lost', 'lost', 7, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_terminal = excluded.is_terminal;

insert into crm_lead_sources (name, slug)
values
  ('Website', 'website'),
  ('Facebook', 'facebook'),
  ('Referral', 'referral'),
  ('Walk-in', 'walk-in'),
  ('WhatsApp', 'whatsapp')
on conflict (slug) do update
set name = excluded.name;

commit;
