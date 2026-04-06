# Database Migrations

Run the SQL files in order against the PostgreSQL database:

```sql
\i db/migrations/001_create_property_schema.sql
\i db/migrations/002_add_crm_auth_columns.sql
\i db/migrations/003_normalize_crm_rbac.sql
\i db/migrations/004_create_crm_leads.sql
```

Current schema file:

- `001_create_property_schema.sql`: core property, pricing, media, lead, and CRM sync tables
- `002_add_crm_auth_columns.sql`: password and login tracking fields for CRM authentication
- `003_normalize_crm_rbac.sql`: normalized CRM roles, permissions, role_permissions, teams, and users.role_id
- `004_create_crm_leads.sql`: CRM lead statuses, sources, lead records, followups, visits, and activity timeline
