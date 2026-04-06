begin;

create extension if not exists pgcrypto;

create table if not exists property_types (
  id bigserial primary key,
  name varchar(100) not null,
  slug varchar(120) not null unique,
  parent_id bigint references property_types(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id bigserial primary key,
  crm_external_id varchar(120),
  contact_type varchar(30) not null,
  name varchar(180) not null,
  phone varchar(30) not null,
  whatsapp_number varchar(30),
  email varchar(180),
  company_name varchar(180),
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id bigserial primary key,
  crm_external_id varchar(120),
  name varchar(180) not null,
  email varchar(180) not null unique,
  phone varchar(30),
  role varchar(30) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists property_locations (
  id bigserial primary key,
  country varchar(100) not null default 'India',
  state varchar(100) not null default 'Uttar Pradesh',
  city varchar(100) not null default 'Bareilly',
  locality varchar(120) not null,
  sub_locality varchar(120),
  address_line1 varchar(255),
  address_line2 varchar(255),
  landmark varchar(255),
  pincode varchar(12),
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists properties (
  id bigserial primary key,
  crm_external_id varchar(120),
  property_code varchar(60) not null unique,
  title varchar(220) not null,
  slug varchar(240) not null unique,
  description text,
  status varchar(30) not null,
  listing_type varchar(30) not null,
  possession_status varchar(30),
  property_type_id bigint not null references property_types(id) on delete restrict,
  location_id bigint not null references property_locations(id) on delete restrict,
  owner_contact_id bigint references contacts(id) on delete set null,
  assigned_agent_id bigint references users(id) on delete set null,
  facing varchar(50),
  source varchar(30) not null default 'manual',
  is_featured boolean not null default false,
  is_verified boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists property_pricing (
  id bigserial primary key,
  property_id bigint not null references properties(id) on delete cascade,
  currency_code char(3) not null default 'INR',
  price_amount numeric(14,2),
  rent_amount numeric(14,2),
  security_deposit numeric(14,2),
  maintenance_amount numeric(14,2),
  price_per_sqft numeric(14,2),
  negotiable boolean not null default false,
  price_label varchar(120),
  effective_from timestamptz not null default now(),
  effective_to timestamptz
);

create table if not exists property_specs (
  property_id bigint primary key references properties(id) on delete cascade,
  bedrooms integer,
  bathrooms integer,
  balconies integer,
  floors_total integer,
  floor_number integer,
  builtup_area numeric(12,2),
  builtup_area_unit varchar(20) not null default 'sqft',
  carpet_area numeric(12,2),
  plot_area numeric(12,2),
  parking_count integer,
  furnishing_status varchar(30),
  age_of_property integer
);

create table if not exists property_features (
  id bigserial primary key,
  name varchar(120) not null,
  slug varchar(140) not null unique
);

create table if not exists property_feature_map (
  property_id bigint not null references properties(id) on delete cascade,
  feature_id bigint not null references property_features(id) on delete cascade,
  primary key (property_id, feature_id)
);

create table if not exists property_media (
  id bigserial primary key,
  property_id bigint not null references properties(id) on delete cascade,
  media_type varchar(30) not null,
  file_url text not null,
  thumbnail_url text,
  alt_text varchar(255),
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists property_leads (
  id bigserial primary key,
  property_id bigint not null references properties(id) on delete cascade,
  contact_id bigint not null references contacts(id) on delete cascade,
  assigned_user_id bigint references users(id) on delete set null,
  source varchar(30) not null,
  lead_status varchar(30) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists property_crm_sync_logs (
  id bigserial primary key,
  property_id bigint not null references properties(id) on delete cascade,
  crm_name varchar(100) not null,
  sync_direction varchar(20) not null,
  payload_json jsonb not null default '{}'::jsonb,
  sync_status varchar(20) not null,
  error_message text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_properties_status on properties(status);
create index if not exists idx_properties_listing_type on properties(listing_type);
create index if not exists idx_properties_property_type_id on properties(property_type_id);
create index if not exists idx_properties_location_id on properties(location_id);
create index if not exists idx_properties_assigned_agent_id on properties(assigned_agent_id);
create index if not exists idx_property_locations_city_locality on property_locations(city, locality);
create index if not exists idx_property_pricing_property_current on property_pricing(property_id, effective_to);
create index if not exists idx_property_pricing_price_amount on property_pricing(price_amount);
create index if not exists idx_property_pricing_rent_amount on property_pricing(rent_amount);
create index if not exists idx_property_leads_assigned_status on property_leads(assigned_user_id, lead_status);
create index if not exists idx_property_media_property_sort on property_media(property_id, sort_order);

insert into property_types (name, slug)
values
  ('Apartment', 'apartment'),
  ('Villa', 'villa'),
  ('Plot', 'plot'),
  ('Independent House', 'independent-house'),
  ('Shop', 'shop'),
  ('Office', 'office')
on conflict (slug) do nothing;

insert into property_locations (country, state, city, locality)
values
  ('India', 'Uttar Pradesh', 'Bareilly', 'Civil Lines'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'DD Puram'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Rajendra Nagar'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Pilibhit Bypass'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Izatnagar'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Model Town'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Prem Nagar'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Rampur Garden'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Delapeer'),
  ('India', 'Uttar Pradesh', 'Bareilly', 'Airport Road')
on conflict do nothing;

commit;
