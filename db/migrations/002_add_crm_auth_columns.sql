begin;

alter table users
  add column if not exists password_hash text,
  add column if not exists last_login_at timestamptz;

create index if not exists idx_users_role_active on users(role, is_active);

commit;
