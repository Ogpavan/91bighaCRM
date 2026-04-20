import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";
import { createNotifications } from "@/lib/crm-notifications";

type LeadRow = {
  id: string;
  sno: number;
  name: string;
  lead_date: string;
  mobile_number: string | null;
  whatsapp_number: string | null;
  occupation: string | null;
  address: string | null;
  associate_name: string | null;
  old_follow_up: string | null;
  telecaller_id: string | null;
  telecaller_name: string | null;
  project_id: string | null;
  project_name: string | null;
  recall_date: string | null;
  remark: string | null;
  source_id: number;
  source_name: string;
  status_id: number;
  status_name: string;
  status_sort_order: number;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  last_activity_at: string | null;
};

type FollowupRow = {
  id: string;
  lead_id: string;
  type: string;
  notes: string | null;
  next_follow_up_date: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  is_overdue: boolean;
};

type VisitRow = {
  id: string;
  lead_id: string;
  visit_date: string;
  project_id: string | null;
  project_name: string | null;
  unit_id: string | null;
  feedback: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  type: string;
  text: string;
  meta: Record<string, unknown> | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type LeadActor = {
  userId: string;
  role: string;
};

export type LeadFilters = {
  page: number;
  limit: number;
  status?: string | null;
  assignedTo?: string | null;
  telecaller?: string | null;
  source?: string | null;
  project?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  search?: string | null;
};

export type CreateLeadPayload = {
  name?: unknown;
  date?: unknown;
  mobileNumber?: unknown;
  whatsappNumber?: unknown;
  occupation?: unknown;
  address?: unknown;
  associate?: unknown;
  oldFollowup?: unknown;
  telecallerId?: unknown;
  projectId?: unknown;
  recall?: unknown;
  remark?: unknown;
  sourceId?: unknown;
  statusId?: unknown;
};

export type UpdateLeadPayload = CreateLeadPayload;

const LEAD_SELECT = `
  select
    l.id::text as id,
    l.id::integer as sno,
    l.name,
    l.lead_date::text as lead_date,
    coalesce(l.mobile_number, l.phone) as mobile_number,
    l.whatsapp_number,
    l.occupation,
    l.address,
    l.associate_name,
    l.old_follow_up,
    coalesce(l.telecaller_id, l.assigned_to)::text as telecaller_id,
    telecaller.name as telecaller_name,
    l.project_id::text as project_id,
    p.title as project_name,
    l.recall_date::text as recall_date,
    l.remark,
    s.id as source_id,
    s.name as source_name,
    st.id as status_id,
    st.name as status_name,
    st.sort_order as status_sort_order,
    l.created_by::text as created_by,
    creator.name as created_by_name,
    l.created_at::text as created_at,
    l.updated_at::text as updated_at,
    l.is_deleted,
    activity.last_activity_at::text as last_activity_at
  from crm_leads l
  join crm_lead_sources s on s.id = l.source_id
  join crm_lead_statuses st on st.id = l.status_id
  left join properties p on p.id = l.project_id
  left join users telecaller on telecaller.id = coalesce(l.telecaller_id, l.assigned_to)
  left join users creator on creator.id = l.created_by
  left join lateral (
    select max(a.created_at) as last_activity_at
    from crm_lead_activities a
    where a.lead_id = l.id
  ) activity on true
`;

function mapLeadRow(row: LeadRow) {
  return {
    id: row.id,
    sno: Number(row.sno),
    name: row.name,
    date: row.lead_date,
    mobileNumber: row.mobile_number,
    whatsappNumber: row.whatsapp_number,
    occupation: row.occupation,
    address: row.address,
    associate: row.associate_name,
    oldFollowup: row.old_follow_up,
    telecallerId: row.telecaller_id,
    telecallerName: row.telecaller_name,
    projectId: row.project_id,
    projectName: row.project_name,
    recall: row.recall_date,
    remark: row.remark,
    sourceId: Number(row.source_id),
    sourceName: row.source_name,
    statusId: Number(row.status_id),
    statusName: row.status_name,
    statusSortOrder: Number(row.status_sort_order),
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted,
    lastActivityAt: row.last_activity_at
  };
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

function getRequiredPhoneNumber(value: unknown, fieldName: string) {
  const normalized = getRequiredString(value, fieldName);
  if (!/^\d{10}$/.test(normalized)) {
    throw new Error(`${fieldName} must be exactly 10 digits.`);
  }

  return normalized;
}

function getOptionalPhoneNumber(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value);
  if (!normalized) {
    return null;
  }

  if (!/^\d{10}$/.test(normalized)) {
    throw new Error(`${fieldName} must be exactly 10 digits.`);
  }

  return normalized;
}

function getOptionalNumber(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

function getOptionalInteger(value: unknown, fieldName: string) {
  const parsed = getOptionalNumber(value, fieldName);
  if (parsed === null) {
    return null;
  }

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid identifier.`);
  }

  return parsed;
}

function getRequiredDateString(value: unknown, fieldName: string) {
  const normalized = getRequiredString(value, fieldName);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return normalized;
}

function getOptionalDateString(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value);
  if (!normalized) {
    return null;
  }

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return normalized;
}

async function ensureUserExists(client: Queryable, userId: number, fieldName: string) {
  const result = await client.query<{ id: string }>("select id::text as id from users where id = $1 limit 1", [userId]);
  if (!result.rows.length) {
    throw new Error(`${fieldName} not found.`);
  }
}

async function ensureProjectExists(client: Queryable, projectId: number) {
  const result = await client.query<{ id: string }>("select id::text as id from properties where id = $1 limit 1", [projectId]);
  if (!result.rows.length) {
    throw new Error("Project not found.");
  }
}

async function ensureSourceExists(client: Queryable, sourceId: number) {
  const result = await client.query<{ id: string }>("select id::text as id from crm_lead_sources where id = $1 limit 1", [sourceId]);
  if (!result.rows.length) {
    throw new Error("Lead source not found.");
  }
}

async function ensureStatusExists(client: Queryable, statusId: number) {
  const result = await client.query<{ id: string }>("select id::text as id from crm_lead_statuses where id = $1 limit 1", [statusId]);
  if (!result.rows.length) {
    throw new Error("Lead status not found.");
  }
}

async function getDefaultStatusId(client: Queryable) {
  const result = await client.query<{ id: string }>(
    "select id::text as id from crm_lead_statuses where slug = 'new' limit 1"
  );

  if (!result.rows.length) {
    throw new Error("Default lead status is missing.");
  }

  return Number(result.rows[0].id);
}

async function insertLeadActivity(
  client: Queryable,
  leadId: number,
  type: string,
  text: string,
  createdBy: number | null,
  meta: Record<string, unknown> | null = null
) {
  await client.query(
    `
      insert into crm_lead_activities (lead_id, activity_type, activity_text, meta_json, created_by)
      values ($1, $2, $3, $4::jsonb, $5)
    `,
    [leadId, type, text, meta ? JSON.stringify(meta) : null, createdBy]
  );
}

function isElevatedRole(role: string) {
  return role === "Admin" || role === "SalesManager";
}

function ensureCanAccessLead(
  lead: ReturnType<typeof mapLeadRow>,
  actor: LeadActor
) {
  if (isElevatedRole(actor.role)) {
    return;
  }

  const actorId = String(actor.userId);
  if (lead.createdBy !== actorId && lead.telecallerId !== actorId) {
    throw new Error("You do not have permission to access this lead.");
  }
}

async function getLeadRecordById(client: Queryable, leadId: number) {
  const result = await client.query<LeadRow>(`${LEAD_SELECT} where l.id = $1 and l.is_deleted = false limit 1`, [leadId]);
  return result.rows[0] ? mapLeadRow(result.rows[0]) : null;
}

let leadsSchemaPromise: Promise<void> | null = null;

export async function ensureCrmLeadsSchema() {
  if (leadsSchemaPromise) {
    return leadsSchemaPromise;
  }

  leadsSchemaPromise = (async () => {
    await ensureCrmAuthSchema();

    await withDbClient(async (client) => {
    await client.query(`
      create table if not exists crm_lead_statuses (
        id bigserial primary key,
        name varchar(80) not null unique,
        slug varchar(80) not null unique,
        sort_order integer not null default 0,
        is_terminal boolean not null default false,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists crm_lead_sources (
        id bigserial primary key,
        name varchar(120) not null unique,
        slug varchar(120) not null unique,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists crm_leads (
        id bigserial primary key,
        name varchar(180) not null,
        lead_date date not null default current_date,
        mobile_number varchar(30) not null,
        whatsapp_number varchar(30),
        occupation varchar(120),
        address text,
        associate_name varchar(180),
        old_follow_up text,
        telecaller_id bigint references users(id) on delete set null,
        project_id bigint references properties(id) on delete set null,
        recall_date timestamptz,
        remark text,
        source_id bigint not null references crm_lead_sources(id) on delete restrict,
        status_id bigint not null references crm_lead_statuses(id) on delete restrict,
        created_by bigint not null references users(id) on delete restrict,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        is_deleted boolean not null default false,
        phone varchar(30),
        email varchar(180),
        budget_min numeric(14,2),
        budget_max numeric(14,2),
        property_type varchar(80),
        preferred_location varchar(180),
        priority varchar(20) not null default 'Medium',
        assigned_to bigint references users(id) on delete set null
      )
    `);
    await client.query(`
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
      add column if not exists remark text
    `);
    await client.query(`
      update crm_leads
      set
        lead_date = coalesce(lead_date, created_at::date, current_date),
        mobile_number = coalesce(mobile_number, phone),
        telecaller_id = coalesce(telecaller_id, assigned_to)
      where lead_date is null
         or mobile_number is null
         or telecaller_id is null
    `);
    await client.query(`alter table crm_leads alter column lead_date set default current_date`);
    await client.query(`create index if not exists idx_crm_leads_status_created on crm_leads(status_id, created_at desc)`);
    await client.query(`create index if not exists idx_crm_leads_source_created on crm_leads(source_id, created_at desc)`);
    await client.query(`create index if not exists idx_crm_leads_telecaller_created on crm_leads(telecaller_id, created_at desc)`);
    await client.query(`create index if not exists idx_crm_leads_project on crm_leads(project_id)`);
    await client.query(`
      create index if not exists idx_crm_leads_search
      on crm_leads(lower(name), lower(coalesce(mobile_number, phone, '')), lower(coalesce(whatsapp_number, '')))
    `);
    await client.query(`
      create table if not exists crm_lead_followups (
        id bigserial primary key,
        lead_id bigint not null references crm_leads(id) on delete cascade,
        type varchar(50) not null,
        notes text,
        next_follow_up_date timestamptz,
        created_by bigint references users(id) on delete set null,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists crm_lead_visits (
        id bigserial primary key,
        lead_id bigint not null references crm_leads(id) on delete cascade,
        visit_date timestamptz not null,
        project_id bigint references properties(id) on delete set null,
        unit_id varchar(120),
        feedback text,
        created_by bigint references users(id) on delete set null,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create table if not exists crm_lead_activities (
        id bigserial primary key,
        lead_id bigint not null references crm_leads(id) on delete cascade,
        activity_type varchar(50) not null,
        activity_text text not null,
        meta_json jsonb,
        created_by bigint references users(id) on delete set null,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`create index if not exists idx_crm_lead_followups_lead_created on crm_lead_followups(lead_id, created_at desc)`);
    await client.query(`create index if not exists idx_crm_lead_visits_lead_created on crm_lead_visits(lead_id, created_at desc)`);
    await client.query(`create index if not exists idx_crm_lead_activities_lead_created on crm_lead_activities(lead_id, created_at desc)`);
    await client.query(`
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
      set name = excluded.name, sort_order = excluded.sort_order, is_terminal = excluded.is_terminal
    `);
    await client.query(`
      insert into crm_lead_sources (name, slug)
      values
        ('Website', 'website'),
        ('Facebook', 'facebook'),
        ('Referral', 'referral'),
        ('Walk-in', 'walk-in'),
        ('WhatsApp', 'whatsapp')
      on conflict (slug) do update
      set name = excluded.name
    `);
  });
  })();

  return leadsSchemaPromise;
}

export async function getLeadsMetadata() {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const [statusesResult, sourcesResult, telecallersResult, projectsResult] = await Promise.all([
      client.query<{ id: string; name: string; sort_order: number }>(
        "select id::text as id, name, sort_order from crm_lead_statuses order by sort_order asc, name asc"
      ),
      client.query<{ id: string; name: string }>("select id::text as id, name from crm_lead_sources order by name asc"),
      client.query<{ id: string; name: string }>(
        "select id::text as id, name from users where is_active = true order by name asc limit 200"
      ),
      client.query<{ id: string; title: string }>(
        "select id::text as id, title from properties where deleted_at is null order by title asc limit 200"
      )
    ]);

    const telecallers = telecallersResult.rows.map((row) => ({ Id: row.id, Name: row.name }));

    return {
      statuses: statusesResult.rows.map((row) => ({ Id: Number(row.id), Name: row.name, SortOrder: Number(row.sort_order) })),
      sources: sourcesResult.rows.map((row) => ({ Id: Number(row.id), Name: row.name })),
      telecallers,
      assignees: telecallers,
      projects: projectsResult.rows.map((row) => ({ Id: row.id, Name: row.title }))
    };
  });
}

export async function listLeads(filters: LeadFilters, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const whereParts = ["l.is_deleted = false"];
    const params: unknown[] = [];

    if (!isElevatedRole(actor.role)) {
      params.push(Number(actor.userId));
      whereParts.push(`(l.created_by = $${params.length} or coalesce(l.telecaller_id, l.assigned_to) = $${params.length})`);
    }

    if (filters.status) {
      params.push(Number(filters.status));
      whereParts.push(`l.status_id = $${params.length}`);
    }

    const telecallerFilter = filters.telecaller ?? filters.assignedTo;
    if (telecallerFilter) {
      params.push(Number(telecallerFilter));
      whereParts.push(`coalesce(l.telecaller_id, l.assigned_to) = $${params.length}`);
    }

    if (filters.source) {
      params.push(Number(filters.source));
      whereParts.push(`l.source_id = $${params.length}`);
    }

    if (filters.project) {
      params.push(Number(filters.project));
      whereParts.push(`l.project_id = $${params.length}`);
    }

    if (filters.fromDate) {
      params.push(filters.fromDate);
      whereParts.push(`l.lead_date >= $${params.length}::date`);
    }

    if (filters.toDate) {
      params.push(filters.toDate);
      whereParts.push(`l.lead_date <= $${params.length}::date`);
    }

    if (filters.search) {
      params.push(`%${String(filters.search).trim().toLowerCase()}%`);
      whereParts.push(`
        (
          lower(l.name) like $${params.length}
          or lower(coalesce(l.mobile_number, l.phone, '')) like $${params.length}
          or lower(coalesce(l.whatsapp_number, '')) like $${params.length}
          or lower(coalesce(l.address, '')) like $${params.length}
          or lower(coalesce(l.associate_name, '')) like $${params.length}
        )
      `);
    }

    const whereClause = whereParts.length ? `where ${whereParts.join(" and ")}` : "";
    const countResult = await client.query<{ count: string }>(`select count(*)::text as count from crm_leads l ${whereClause}`, params);

    params.push(filters.limit);
    params.push((filters.page - 1) * filters.limit);
    const limitParam = `$${params.length - 1}`;
    const offsetParam = `$${params.length}`;

    const result = await client.query<LeadRow>(
      `${LEAD_SELECT}
       ${whereClause}
       order by l.lead_date desc, l.id desc
       limit ${limitParam}
       offset ${offsetParam}`,
      params
    );

    const total = Number(countResult.rows[0]?.count ?? 0);

    return {
      items: result.rows.map(mapLeadRow),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit))
      }
    };
  });
}

export async function createLead(payload: CreateLeadPayload, actorUserId: string) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const name = getRequiredString(payload.name, "Name");
    const date = getRequiredDateString(payload.date ?? new Date().toISOString(), "Date");
    const mobileNumber = getRequiredPhoneNumber(payload.mobileNumber, "Mobile number");
    const whatsappNumber = getOptionalPhoneNumber(payload.whatsappNumber, "WhatsApp number");
    const occupation = getOptionalString(payload.occupation);
    const address = getOptionalString(payload.address);
    const associate = getOptionalString(payload.associate);
    const oldFollowup = getOptionalString(payload.oldFollowup);
    const telecallerId = getOptionalInteger(payload.telecallerId, "Telecaller");
    const projectId = getOptionalInteger(payload.projectId, "Project");
    const recall = getOptionalDateString(payload.recall, "Recall");
    const remark = getOptionalString(payload.remark);
    const sourceId = getOptionalInteger(payload.sourceId, "Source");
    const statusId = getOptionalInteger(payload.statusId, "Status");
    const createdBy = Number(actorUserId);

    await ensureUserExists(client, createdBy, "Creator");

    if (!sourceId) {
      throw new Error("Source is required.");
    }

    await ensureSourceExists(client, sourceId);

    const effectiveStatusId = statusId ?? (await getDefaultStatusId(client));
    await ensureStatusExists(client, effectiveStatusId);

    if (telecallerId) {
      await ensureUserExists(client, telecallerId, "Telecaller");
    }

    if (projectId) {
      await ensureProjectExists(client, projectId);
    }

    const result = await client.query<{ id: string }>(
      `
        insert into crm_leads (
          name,
          lead_date,
          mobile_number,
          whatsapp_number,
          occupation,
          address,
          associate_name,
          old_follow_up,
          telecaller_id,
          project_id,
          recall_date,
          remark,
          source_id,
          status_id,
          created_by,
          updated_at,
          phone,
          assigned_to
        )
        values ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12, $13, $14, $15, now(), $3, $9)
        returning id::text as id
      `,
      [
        name,
        date,
        mobileNumber,
        whatsappNumber,
        occupation,
        address,
        associate,
        oldFollowup,
        telecallerId,
        projectId,
        recall,
        remark,
        sourceId,
        effectiveStatusId,
        createdBy
      ]
    );

    const leadId = Number(result.rows[0].id);
    await insertLeadActivity(client, leadId, "lead_created", "Lead created.", createdBy, {
      mobileNumber,
      sourceId,
      statusId: effectiveStatusId
    });

    await createNotifications(
      [
        telecallerId && telecallerId !== createdBy
          ? {
              userId: telecallerId,
              type: "lead_assigned",
              title: "New lead assigned",
              message: `${name} has been assigned to you.`,
              entityType: "lead",
              entityId: leadId
            }
          : null,
        {
          userId: createdBy,
          type: "lead_created",
          title: "Lead created",
          message: `Lead "${name}" was created successfully.`,
          entityType: "lead",
          entityId: leadId
        }
      ].filter(Boolean) as Array<{
        userId: number;
        type: string;
        title: string;
        message: string;
        entityType: string;
        entityId: number;
      }>,
      client
    );

    const lead = await getLeadRecordById(client, leadId);
    if (!lead) {
      throw new Error("Lead could not be loaded after creation.");
    }

    return lead;
  });
}

export async function getLeadById(id: string, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    if (!leadId) {
      throw new Error("Lead not found.");
    }

    const lead = await getLeadRecordById(client, leadId);
    if (!lead) {
      throw new Error("Lead not found.");
    }

    ensureCanAccessLead(lead, actor);

    return lead;
  });
}

export async function updateLead(id: string, payload: UpdateLeadPayload, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    if (!leadId) {
      throw new Error("Lead not found.");
    }

    const existing = await getLeadRecordById(client, leadId);
    if (!existing) {
      throw new Error("Lead not found.");
    }

    ensureCanAccessLead(existing, actor);

    const updates: string[] = [];
    const params: unknown[] = [];
    const activityMeta: Record<string, unknown> = {};

    const setField = (sql: string, value: unknown, key: string) => {
      params.push(value);
      updates.push(`${sql} = $${params.length}`);
      activityMeta[key] = value;
    };

    if (payload.name !== undefined) {
      setField("name", getRequiredString(payload.name, "Name"), "name");
    }
    if (payload.date !== undefined) {
      setField("lead_date", getRequiredDateString(payload.date, "Date"), "date");
    }
    if (payload.mobileNumber !== undefined) {
      const mobileNumber = getRequiredPhoneNumber(payload.mobileNumber, "Mobile number");
      setField("mobile_number", mobileNumber, "mobileNumber");
      setField("phone", mobileNumber, "phone");
    }
    if (payload.whatsappNumber !== undefined) {
      setField("whatsapp_number", getOptionalPhoneNumber(payload.whatsappNumber, "WhatsApp number"), "whatsappNumber");
    }
    if (payload.occupation !== undefined) {
      setField("occupation", getOptionalString(payload.occupation), "occupation");
    }
    if (payload.address !== undefined) {
      setField("address", getOptionalString(payload.address), "address");
    }
    if (payload.associate !== undefined) {
      setField("associate_name", getOptionalString(payload.associate), "associate");
    }
    if (payload.oldFollowup !== undefined) {
      setField("old_follow_up", getOptionalString(payload.oldFollowup), "oldFollowup");
    }
    if (payload.telecallerId !== undefined) {
      const telecallerId = getOptionalInteger(payload.telecallerId, "Telecaller");
      if (telecallerId) {
        await ensureUserExists(client, telecallerId, "Telecaller");
      }
      setField("telecaller_id", telecallerId, "telecallerId");
      setField("assigned_to", telecallerId, "assignedTo");
    }
    if (payload.projectId !== undefined) {
      const projectId = getOptionalInteger(payload.projectId, "Project");
      if (projectId) {
        await ensureProjectExists(client, projectId);
      }
      setField("project_id", projectId, "projectId");
    }
    if (payload.recall !== undefined) {
      setField("recall_date", getOptionalDateString(payload.recall, "Recall"), "recall");
    }
    if (payload.remark !== undefined) {
      setField("remark", getOptionalString(payload.remark), "remark");
    }
    if (payload.sourceId !== undefined) {
      const sourceId = getOptionalInteger(payload.sourceId, "Source");
      if (!sourceId) {
        throw new Error("Source is required.");
      }
      await ensureSourceExists(client, sourceId);
      setField("source_id", sourceId, "sourceId");
    }
    if (payload.statusId !== undefined) {
      const statusId = getOptionalInteger(payload.statusId, "Status");
      if (!statusId) {
        throw new Error("Status is required.");
      }
      await ensureStatusExists(client, statusId);
      setField("status_id", statusId, "statusId");
    }

    if (!updates.length) {
      return existing;
    }

    params.push(leadId);
    await client.query(`update crm_leads set ${updates.join(", ")}, updated_at = now() where id = $${params.length}`, params);

    const actorId = Number(actor.userId);
    if (payload.statusId !== undefined) {
      const statusResult = await client.query<{ name: string }>("select name from crm_lead_statuses where id = $1", [Number(payload.statusId)]);
      await insertLeadActivity(client, leadId, "status_changed", `Lead status changed to ${statusResult.rows[0]?.name || "updated"}.`, actorId, activityMeta);
    } else {
      await insertLeadActivity(client, leadId, "lead_updated", "Lead details updated.", actorId, activityMeta);
    }

    const notificationJobs: Array<{
      userId: number;
      type: string;
      title: string;
      message: string;
      entityType: string;
      entityId: number;
    }> = [];

    if (payload.telecallerId !== undefined) {
      const nextTelecallerId = activityMeta.telecallerId ? Number(activityMeta.telecallerId) : null;
      const previousTelecallerId = existing.telecallerId ? Number(existing.telecallerId) : null;

      if (nextTelecallerId && nextTelecallerId !== previousTelecallerId) {
        notificationJobs.push({
          userId: nextTelecallerId,
          type: "lead_reassigned",
          title: "Lead assigned to you",
          message: `${existing.name} has been assigned to you.`,
          entityType: "lead",
          entityId: leadId
        });
      }
    }

    if (payload.statusId !== undefined && existing.telecallerId) {
      const statusResult = await client.query<{ name: string }>("select name from crm_lead_statuses where id = $1", [Number(payload.statusId)]);
      notificationJobs.push({
        userId: Number(existing.telecallerId),
        type: "lead_status_changed",
        title: "Lead status updated",
        message: `${existing.name} moved to ${statusResult.rows[0]?.name || "a new status"}.`,
        entityType: "lead",
        entityId: leadId
      });
    }

    if (notificationJobs.length) {
      await createNotifications(notificationJobs, client);
    }

    const lead = await getLeadRecordById(client, leadId);
    if (!lead) {
      throw new Error("Lead not found.");
    }

    return lead;
  });
}

export async function deleteLead(id: string, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    if (!leadId) {
      throw new Error("Lead not found.");
    }

    const existing = await getLeadRecordById(client, leadId);
    if (!existing) {
      throw new Error("Lead not found.");
    }

    ensureCanAccessLead(existing, actor);

    await client.query(
      `
        update crm_leads
        set is_deleted = true, updated_at = now()
        where id = $1
      `,
      [leadId]
    );

    await insertLeadActivity(client, leadId, "lead_deleted", "Lead deleted.", Number(actor.userId), null);

    return { id: existing.id };
  });
}

export async function listLeadFollowups(id: string, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    const lead = leadId ? await getLeadRecordById(client, leadId) : null;
    if (!leadId || !lead) {
      throw new Error("Lead not found.");
    }
    ensureCanAccessLead(lead, actor);

    const result = await client.query<FollowupRow>(
      `
        select
          f.id::text as id,
          f.lead_id::text as lead_id,
          f.type,
          f.notes,
          f.next_follow_up_date::text as next_follow_up_date,
          f.created_by::text as created_by,
          u.name as created_by_name,
          f.created_at::text as created_at,
          (f.next_follow_up_date is not null and f.next_follow_up_date < now()) as is_overdue
        from crm_lead_followups f
        left join users u on u.id = f.created_by
        where f.lead_id = $1
        order by f.created_at desc
      `,
      [leadId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      type: row.type,
      notes: row.notes,
      nextFollowUpDate: row.next_follow_up_date,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at,
      isOverdue: row.is_overdue
    }));
  });
}

export async function addLeadFollowup(
  id: string,
  payload: { type?: unknown; notes?: unknown; nextFollowUpDate?: unknown },
  actor: LeadActor
) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    const lead = leadId ? await getLeadRecordById(client, leadId) : null;
    if (!leadId || !lead) {
      throw new Error("Lead not found.");
    }
    ensureCanAccessLead(lead, actor);

    const type = getRequiredString(payload.type, "Follow-up type");
    const notes = getOptionalString(payload.notes);
    const nextFollowUpDate = getOptionalDateString(payload.nextFollowUpDate, "Next follow-up date");
    const actorId = Number(actor.userId);

    const result = await client.query<FollowupRow>(
      `
        insert into crm_lead_followups (lead_id, type, notes, next_follow_up_date, created_by)
        values ($1, $2, $3, $4::timestamptz, $5)
        returning
          id::text as id,
          lead_id::text as lead_id,
          type,
          notes,
          next_follow_up_date::text as next_follow_up_date,
          created_by::text as created_by,
          created_at::text as created_at,
          false as is_overdue
      `,
      [leadId, type, notes, nextFollowUpDate, actorId]
    );

    await client.query(
      `
        update crm_leads
        set
          old_follow_up = coalesce($2, old_follow_up),
          recall_date = coalesce($3::timestamptz, recall_date),
          updated_at = now()
        where id = $1
      `,
      [leadId, notes, nextFollowUpDate]
    );
    await insertLeadActivity(client, leadId, "followup_added", `Follow-up added: ${type}.`, actorId, {
      nextFollowUpDate,
      notes
    });

    const created = result.rows[0];
    const creator = await client.query<{ name: string }>("select name from users where id = $1", [actorId]);

    return {
      id: created.id,
      leadId: created.lead_id,
      type: created.type,
      notes: created.notes,
      nextFollowUpDate: created.next_follow_up_date,
      createdBy: created.created_by,
      createdByName: creator.rows[0]?.name ?? null,
      createdAt: created.created_at,
      isOverdue: false
    };
  });
}

export async function listLeadVisits(id: string, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    const lead = leadId ? await getLeadRecordById(client, leadId) : null;
    if (!leadId || !lead) {
      throw new Error("Lead not found.");
    }
    ensureCanAccessLead(lead, actor);

    const result = await client.query<VisitRow>(
      `
        select
          v.id::text as id,
          v.lead_id::text as lead_id,
          v.visit_date::text as visit_date,
          v.project_id::text as project_id,
          p.title as project_name,
          v.unit_id,
          v.feedback,
          v.created_by::text as created_by,
          u.name as created_by_name,
          v.created_at::text as created_at
        from crm_lead_visits v
        left join properties p on p.id = v.project_id
        left join users u on u.id = v.created_by
        where v.lead_id = $1
        order by v.visit_date desc, v.created_at desc
      `,
      [leadId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      visitDate: row.visit_date,
      projectId: row.project_id,
      projectName: row.project_name,
      unitId: row.unit_id,
      feedback: row.feedback,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at
    }));
  });
}

export async function addLeadVisit(
  id: string,
  payload: { visitDate?: unknown; projectId?: unknown; unitId?: unknown; feedback?: unknown },
  actor: LeadActor
) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    const lead = leadId ? await getLeadRecordById(client, leadId) : null;
    if (!leadId || !lead) {
      throw new Error("Lead not found.");
    }
    ensureCanAccessLead(lead, actor);

    const visitDate = getRequiredDateString(payload.visitDate, "Visit date");
    const projectId = getOptionalInteger(payload.projectId, "Project");
    const unitId = getOptionalString(payload.unitId);
    const feedback = getOptionalString(payload.feedback);
    const actorId = Number(actor.userId);

    if (projectId) {
      await ensureProjectExists(client, projectId);
    }

    const result = await client.query<VisitRow>(
      `
        insert into crm_lead_visits (lead_id, visit_date, project_id, unit_id, feedback, created_by)
        values ($1, $2::timestamptz, $3, $4, $5, $6)
        returning
          id::text as id,
          lead_id::text as lead_id,
          visit_date::text as visit_date,
          project_id::text as project_id,
          unit_id,
          feedback,
          created_by::text as created_by,
          created_at::text as created_at
      `,
      [leadId, visitDate, projectId, unitId, feedback, actorId]
    );

    await client.query("update crm_leads set updated_at = now() where id = $1", [leadId]);
    await insertLeadActivity(client, leadId, "visit_added", "Site visit recorded.", actorId, {
      visitDate,
      projectId,
      unitId
    });

    const created = result.rows[0];
    const [creator, project] = await Promise.all([
      client.query<{ name: string }>("select name from users where id = $1", [actorId]),
      projectId ? client.query<{ title: string }>("select title from properties where id = $1", [projectId]) : Promise.resolve({ rows: [] as { title: string }[] })
    ]);

    return {
      id: created.id,
      leadId: created.lead_id,
      visitDate: created.visit_date,
      projectId: created.project_id,
      projectName: project.rows[0]?.title ?? null,
      unitId: created.unit_id,
      feedback: created.feedback,
      createdBy: created.created_by,
      createdByName: creator.rows[0]?.name ?? null,
      createdAt: created.created_at
    };
  });
}

export async function listLeadActivities(id: string, actor: LeadActor) {
  await ensureCrmLeadsSchema();

  return withDbClient(async (client) => {
    const leadId = getOptionalInteger(id, "Lead");
    const lead = leadId ? await getLeadRecordById(client, leadId) : null;
    if (!leadId || !lead) {
      throw new Error("Lead not found.");
    }
    ensureCanAccessLead(lead, actor);

    const result = await client.query<ActivityRow>(
      `
        select
          a.id::text as id,
          a.activity_type as type,
          a.activity_text as text,
          a.meta_json as meta,
          a.created_by::text as created_by,
          u.name as created_by_name,
          a.created_at::text as created_at
        from crm_lead_activities a
        left join users u on u.id = a.created_by
        where a.lead_id = $1
        order by a.created_at desc
      `,
      [leadId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      text: row.text,
      meta: row.meta,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      createdAt: row.created_at
    }));
  });
}
