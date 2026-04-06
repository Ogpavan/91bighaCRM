# 91bigha

Bareilly-focused real estate frontend built with Next.js.

## Production Deployment

This repo is prepared for:

- `91bigha.com` -> Next.js website and API
- `crm.91bigha.com` -> Vite CRM frontend

Deployment assets are included here:

- [deploy/README.md](/home/pawan/Documents/pawan/Pawan/Projects/Realestate/deploy/README.md)
- [deploy/nginx/91bigha.conf](/home/pawan/Documents/pawan/Pawan/Projects/Realestate/deploy/nginx/91bigha.conf)
- [deploy/systemd/91bigha-web.service](/home/pawan/Documents/pawan/Pawan/Projects/Realestate/deploy/systemd/91bigha-web.service)
- [deploy/env/site.env.example](/home/pawan/Documents/pawan/Pawan/Projects/Realestate/deploy/env/site.env.example)

Build both deployable bundles with:

```bash
bash scripts/prepare-deployment.sh
```

## Database Target

Primary PostgreSQL target:

```text
jdbc:postgresql://72.60.96.5:5432/bigha
```

App-side environment format:

```text
DB_HOST=72.60.96.5
DB_PORT=5432
DB_NAME=bigha
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DATABASE_URL=postgresql://your_db_user:your_db_password@72.60.96.5:5432/bigha
```

## Current Connection Status

The project is prepared for PostgreSQL configuration, but a live DB connection has not been verified yet from this environment because:

- the shell does not have `node`, `npm`, `psql`, or `java` available to run a DB client
- the JDBC URL does not include a username/password

## Scalable Property Schema

Use a normalized core schema so the website can grow into CRM sync, lead management, and listing history without redesigning the database later.

### 1. `property_types`

Stores the canonical property category tree.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| name | varchar(100) | `Apartment`, `Villa`, `Plot`, `Shop` |
| slug | varchar(120) unique | |
| parent_id | bigint nullable | self-reference for hierarchy |
| created_at | timestamptz | default now() |

### 2. `contacts`

Reusable people/business records for owners, builders, agents, buyers, and tenants.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| crm_external_id | varchar(120) nullable | CRM-side identifier |
| contact_type | varchar(30) | owner, builder, agent, buyer, tenant |
| name | varchar(180) | |
| phone | varchar(30) | |
| whatsapp_number | varchar(30) nullable | |
| email | varchar(180) nullable | |
| company_name | varchar(180) nullable | |
| address | text nullable | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 3. `users`

Internal users for site admins, managers, and agents.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| crm_external_id | varchar(120) nullable | |
| name | varchar(180) | |
| email | varchar(180) unique | |
| phone | varchar(30) nullable | |
| role | varchar(30) | admin, manager, agent |
| is_active | boolean | default true |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 4. `property_locations`

Location table separated from the listing so mapping and locality-based search stay clean.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| country | varchar(100) | default `India` |
| state | varchar(100) | default `Uttar Pradesh` |
| city | varchar(100) | default `Bareilly` |
| locality | varchar(120) | `Civil Lines`, `DD Puram` |
| sub_locality | varchar(120) nullable | |
| address_line1 | varchar(255) nullable | |
| address_line2 | varchar(255) nullable | |
| landmark | varchar(255) nullable | |
| pincode | varchar(12) nullable | |
| latitude | numeric(10,7) nullable | |
| longitude | numeric(10,7) nullable | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 5. `properties`

Main listing record.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| crm_external_id | varchar(120) nullable | CRM-side property id |
| property_code | varchar(60) unique | human-friendly code |
| title | varchar(220) | |
| slug | varchar(240) unique | |
| description | text nullable | |
| status | varchar(30) | draft, active, sold, rented, inactive |
| listing_type | varchar(30) | sale, rent, lease |
| possession_status | varchar(30) nullable | ready_to_move, under_construction, resale, new_launch |
| property_type_id | bigint | fk to `property_types` |
| location_id | bigint | fk to `property_locations` |
| owner_contact_id | bigint nullable | fk to `contacts` |
| assigned_agent_id | bigint nullable | fk to `users` |
| facing | varchar(50) nullable | |
| source | varchar(30) | manual, crm, partner, import |
| is_featured | boolean | default false |
| is_verified | boolean | default false |
| published_at | timestamptz nullable | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| deleted_at | timestamptz nullable | soft delete |

### 6. `property_pricing`

Separate pricing table for current and historical prices.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| property_id | bigint | fk to `properties` |
| currency_code | char(3) | default `INR` |
| price_amount | numeric(14,2) nullable | sale amount |
| rent_amount | numeric(14,2) nullable | monthly rent |
| security_deposit | numeric(14,2) nullable | |
| maintenance_amount | numeric(14,2) nullable | |
| price_per_sqft | numeric(14,2) nullable | |
| negotiable | boolean | default false |
| price_label | varchar(120) nullable | e.g. `On Request` |
| effective_from | timestamptz | default now() |
| effective_to | timestamptz nullable | null means current |

### 7. `property_specs`

Physical property details.

| column | type | notes |
|---|---|---|
| property_id | bigint pk | fk to `properties` |
| bedrooms | integer nullable | |
| bathrooms | integer nullable | |
| balconies | integer nullable | |
| floors_total | integer nullable | |
| floor_number | integer nullable | |
| builtup_area | numeric(12,2) nullable | |
| builtup_area_unit | varchar(20) | default `sqft` |
| carpet_area | numeric(12,2) nullable | |
| plot_area | numeric(12,2) nullable | |
| parking_count | integer nullable | |
| furnishing_status | varchar(30) nullable | unfurnished, semi_furnished, fully_furnished |
| age_of_property | integer nullable | years |

### 8. `property_features`

Feature catalog.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| name | varchar(120) | |
| slug | varchar(140) unique | |

### 9. `property_feature_map`

Many-to-many bridge between properties and features.

| column | type | notes |
|---|---|---|
| property_id | bigint | fk to `properties` |
| feature_id | bigint | fk to `property_features` |

Recommended unique key:

```text
(property_id, feature_id)
```

### 10. `property_media`

Images, videos, floor plans, and documents.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| property_id | bigint | fk to `properties` |
| media_type | varchar(30) | image, video, floor_plan, document |
| file_url | text | |
| thumbnail_url | text nullable | |
| alt_text | varchar(255) nullable | |
| sort_order | integer | default 0 |
| is_cover | boolean | default false |
| created_at | timestamptz | default now() |

### 11. `property_leads`

Website and CRM lead tracking.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| property_id | bigint | fk to `properties` |
| contact_id | bigint | fk to `contacts` |
| assigned_user_id | bigint nullable | fk to `users` |
| source | varchar(30) | website, whatsapp, call, crm, portal |
| lead_status | varchar(30) | new, contacted, site_visit, negotiation, won, lost |
| notes | text nullable | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### 12. `property_crm_sync_logs`

Tracks property sync state with the future CRM.

| column | type | notes |
|---|---|---|
| id | bigserial pk | |
| property_id | bigint | fk to `properties` |
| crm_name | varchar(100) | |
| sync_direction | varchar(20) | push, pull |
| payload_json | jsonb | |
| sync_status | varchar(20) | success, failed, pending |
| error_message | text nullable | |
| synced_at | timestamptz nullable | |
| created_at | timestamptz | default now() |

## Indexing

Add indexes early for search and CRM sync speed:

- `properties(status)`
- `properties(listing_type)`
- `properties(property_type_id)`
- `properties(location_id)`
- `properties(assigned_agent_id)`
- `property_locations(city, locality)`
- `property_pricing(property_id, effective_to)`
- `property_pricing(price_amount)`
- `property_pricing(rent_amount)`
- `property_leads(assigned_user_id, lead_status)`
- `property_media(property_id, sort_order)`

## Suggested Next Step

Once DB credentials are available, add a PostgreSQL client package and create:

- a DB connection module
- SQL migrations for the tables above
- seed data for Bareilly localities
- CRM sync jobs for `crm_external_id` and `property_crm_sync_logs`
# 91bighaCRM
