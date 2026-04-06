import { withDbClient } from "@/lib/db";

type ProjectRow = {
  id: string;
  project_code: string;
  name: string;
  slug: string;
  location: string | null;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  properties_count: string;
};

export type CreateProjectEntityInput = {
  name?: unknown;
  location?: unknown;
  status?: unknown;
  description?: unknown;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function getOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function mapProjectRow(row: ProjectRow) {
  return {
    id: row.id,
    projectCode: row.project_code,
    name: row.name,
    slug: row.slug,
    location: row.location,
    status: row.status,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propertiesCount: Number(row.properties_count)
  };
}

export async function ensureProjectsEntitySchema() {
  await withDbClient(async (client) => {
    await client.query(`
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
      )
    `);
    await client.query(`
      alter table properties
      add column if not exists project_id bigint references projects(id) on delete set null
    `);
    await client.query(`create index if not exists idx_projects_status on projects(status)`);
    await client.query(`create index if not exists idx_projects_name on projects(lower(name))`);
    await client.query(`create index if not exists idx_properties_project_id on properties(project_id)`);
  });
}

export async function listProjectsEntity() {
  await ensureProjectsEntitySchema();

  return withDbClient(async (client) => {
    const result = await client.query<ProjectRow>(`
      select
        p.id::text as id,
        p.project_code,
        p.name,
        p.slug,
        p.location,
        p.status,
        p.description,
        p.created_at::text as created_at,
        p.updated_at::text as updated_at,
        count(pr.id)::text as properties_count
      from projects p
      left join properties pr on pr.project_id = p.id and pr.deleted_at is null
      group by p.id
      order by p.created_at desc
    `);

    return result.rows.map(mapProjectRow);
  });
}

export async function createProjectEntity(input: CreateProjectEntityInput) {
  await ensureProjectsEntitySchema();

  return withDbClient(async (client) => {
    const name = getRequiredString(input.name, "Project name");
    const location = getOptionalString(input.location);
    const status = getOptionalString(input.status) || "active";
    const description = getOptionalString(input.description);
    const codeSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const projectCode = `PRJ-${codeSeed.toUpperCase()}`;
    const slug = `${slugify(name)}-${codeSeed}`;

    const result = await client.query<ProjectRow>(
      `
        insert into projects (
          project_code,
          name,
          slug,
          location,
          status,
          description,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, now())
        returning
          id::text as id,
          project_code,
          name,
          slug,
          location,
          status,
          description,
          created_at::text as created_at,
          updated_at::text as updated_at,
          '0'::text as properties_count
      `,
      [projectCode, name, slug, location, status, description]
    );

    return mapProjectRow(result.rows[0]);
  });
}
