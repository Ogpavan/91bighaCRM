begin;

alter table crm_leads
  add column if not exists lead_date date,
  add column if not exists mobile_number varchar(30),
  add column if not exists whatsapp_number varchar(30),
  add column if not exists occupation varchar(120),
  add column if not exists address text,
  add column if not exists associate_name varchar(180),
  add column if not exists old_follow_up text,
  add column if not exists telecaller_id bigint references users(id) on delete set null,
  add column if not exists recall_date timestamptz,
  add column if not exists remark text;

update crm_leads
set
  lead_date = coalesce(lead_date, created_at::date, current_date),
  mobile_number = coalesce(mobile_number, phone),
  telecaller_id = coalesce(telecaller_id, assigned_to)
where lead_date is null
   or mobile_number is null
   or telecaller_id is null;

alter table crm_leads
  alter column lead_date set default current_date;

create index if not exists idx_crm_leads_telecaller_created on crm_leads(telecaller_id, created_at desc);
create index if not exists idx_crm_leads_search on crm_leads(lower(name), lower(coalesce(mobile_number, phone, '')), lower(coalesce(whatsapp_number, '')));

commit;
