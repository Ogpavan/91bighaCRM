import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";
import { ensureCrmLeadsSchema } from "@/lib/crm-leads";
import { createNotifications } from "@/lib/crm-notifications";

type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string | null;
  lead_id: string | null;
  lead_name: string | null;
  project_id: string | null;
  project_name: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
};

type TaskActivityRow = {
  activity_type: string;
  activity_text: string;
  created_at: string | null;
  created_by_name: string | null;
};

type CountRow = {
  count: string;
};

export type TaskFilters = {
  page: number;
  limit: number;
  assignedTo?: string | null;
  status?: string | null;
  priority?: string | null;
  type?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  leadId?: string | null;
  projectId?: string | null;
};

export type CreateTaskPayload = {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  status?: unknown;
  priority?: unknown;
  dueDate?: unknown;
  assignedTo?: unknown;
  leadId?: unknown;
  projectId?: unknown;
  bookingId?: unknown;
};

export type UpdateTaskPayload = CreateTaskPayload;

export const CRM_TASK_TYPES = ["Follow-up", "Site Visit", "Payment Reminder", "Document Collection", "Internal"] as const;
export const CRM_TASK_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"] as const;
export const CRM_TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

const TASK_SELECT = `
  select
    t.id::text as id,
    t.title,
    t.description,
    t.task_type,
    t.status,
    t.priority,
    t.due_date::text as due_date,
    t.completed_at::text as completed_at,
    t.assigned_to::text as assigned_to,
    assigned_user.name as assigned_to_name,
    t.created_by::text as created_by,
    creator.name as created_by_name,
    t.lead_id::text as lead_id,
    l.name as lead_name,
    t.project_id::text as project_id,
    p.title as project_name,
    t.booking_id::text as booking_id,
    t.created_at::text as created_at,
    t.updated_at::text as updated_at,
    t.is_deleted
  from crm_tasks t
  join users assigned_user on assigned_user.id = t.assigned_to
  join users creator on creator.id = t.created_by
  left join crm_leads l on l.id = t.lead_id
  left join properties p on p.id = t.project_id
`;

function mapTaskRow(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.task_type,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    leadId: row.lead_id,
    leadName: row.lead_name,
    projectId: row.project_id,
    projectName: row.project_name,
    bookingId: row.booking_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted
  };
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isElevatedRole(role: string) {
  return role === "Admin" || role === "SalesManager";
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

function getOptionalInteger(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a valid identifier.`);
  }

  return parsed;
}

function getOptionalDate(value: unknown, fieldName: string) {
  const normalized = getOptionalString(value);
  if (!normalized) {
    return null;
  }

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return normalized;
}

function getValidatedValue<T extends readonly string[]>(value: unknown, fieldName: string, allowed: T, fallback?: string) {
  const normalized = getOptionalString(value);
  if (!normalized) {
    if (fallback) {
      return fallback;
    }
    throw new Error(`${fieldName} is required.`);
  }

  const match = allowed.find((item) => normalizeText(item) === normalizeText(normalized));
  if (!match) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return match;
}

async function ensureUserExists(client: Queryable, userId: number, fieldName: string) {
  const result = await client.query<{ id: string }>("select id::text as id from users where id = $1 and is_active = true", [userId]);
  if (!result.rows.length) {
    throw new Error(`${fieldName} was not found.`);
  }
}

async function ensureLeadExists(client: Queryable, leadId: number) {
  const result = await client.query<{ id: string }>("select id::text as id from crm_leads where id = $1 and is_deleted = false", [leadId]);
  if (!result.rows.length) {
    throw new Error("Lead was not found.");
  }
}

async function ensureProjectExists(client: Queryable, projectId: number) {
  const result = await client.query<{ id: string }>("select id::text as id from properties where id = $1 and deleted_at is null", [projectId]);
  if (!result.rows.length) {
    throw new Error("Project was not found.");
  }
}

async function insertTaskActivity(client: Queryable, taskId: number, activityType: string, activityText: string, createdBy: number, meta?: Record<string, unknown>) {
  await client.query(
    `
      insert into crm_task_activities (task_id, activity_type, activity_text, meta, created_by)
      values ($1, $2, $3, $4::jsonb, $5)
    `,
    [taskId, activityType, activityText, meta ? JSON.stringify(meta) : null, createdBy]
  );
}

function getScopeClause(role: string, userId: string, params: unknown[]) {
  if (isElevatedRole(role)) {
    return "";
  }

  params.push(Number(userId));
  return ` and (t.assigned_to = $${params.length} or t.created_by = $${params.length})`;
}

export async function ensureCrmTasksSchema() {
  await ensureCrmAuthSchema();
  await ensureCrmLeadsSchema();

  await withDbClient(async (client) => {
    await client.query(`
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
      )
    `);
    await client.query(`
      create index if not exists idx_crm_tasks_assigned_to
      on crm_tasks(assigned_to)
      where is_deleted = false
    `);
    await client.query(`
      create index if not exists idx_crm_tasks_created_by
      on crm_tasks(created_by)
      where is_deleted = false
    `);
    await client.query(`
      create index if not exists idx_crm_tasks_status
      on crm_tasks(status)
      where is_deleted = false
    `);
    await client.query(`
      create index if not exists idx_crm_tasks_due_date
      on crm_tasks(due_date)
      where is_deleted = false
    `);
    await client.query(`
      create table if not exists crm_task_activities (
        id bigserial primary key,
        task_id bigint not null references crm_tasks(id) on delete cascade,
        activity_type varchar(60) not null,
        activity_text text not null,
        meta jsonb,
        created_by bigint references users(id) on delete set null,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create index if not exists idx_crm_task_activities_task_id
      on crm_task_activities(task_id, created_at desc)
    `);
  });
}

export async function listTasks(filters: TaskFilters, actor: { userId: string; role: string }) {
  await ensureCrmTasksSchema();

  return withDbClient(async (client) => {
    const params: unknown[] = [];
    const whereParts = ["t.is_deleted = false"];

    if (filters.assignedTo) {
      params.push(Number(filters.assignedTo));
      whereParts.push(`t.assigned_to = $${params.length}`);
    }

    if (filters.status) {
      params.push(filters.status);
      whereParts.push(`t.status = $${params.length}`);
    }

    if (filters.priority) {
      params.push(filters.priority);
      whereParts.push(`t.priority = $${params.length}`);
    }

    if (filters.type) {
      params.push(filters.type);
      whereParts.push(`t.task_type = $${params.length}`);
    }

    if (filters.fromDate) {
      params.push(filters.fromDate);
      whereParts.push(`t.due_date is not null and t.due_date >= $${params.length}::timestamptz`);
    }

    if (filters.toDate) {
      params.push(filters.toDate);
      whereParts.push(`t.due_date is not null and t.due_date < ($${params.length}::date + interval '1 day')`);
    }

    if (filters.leadId) {
      params.push(Number(filters.leadId));
      whereParts.push(`t.lead_id = $${params.length}`);
    }

    if (filters.projectId) {
      params.push(Number(filters.projectId));
      whereParts.push(`t.project_id = $${params.length}`);
    }

    const scopeClause = getScopeClause(actor.role, actor.userId, params);
    if (scopeClause) {
      whereParts.push(scopeClause.slice(5));
    }

    const whereClause = `where ${whereParts.join(" and ")}`;
    const offset = (filters.page - 1) * filters.limit;

    params.push(filters.limit);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const [itemsResult, countResult] = await Promise.all([
      client.query<TaskRow>(
        `
          ${TASK_SELECT}
          ${whereClause}
          order by
            case when t.status = 'Completed' then 1 else 0 end asc,
            t.due_date asc nulls last,
            t.created_at desc
          limit ${limitParam}
          offset ${offsetParam}
        `,
        params
      ),
      client.query<CountRow>(
        `
          select count(*)::text as count
          from crm_tasks t
          ${whereClause}
        `,
        params.slice(0, -2)
      )
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);

    return {
      items: itemsResult.rows.map(mapTaskRow),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / filters.limit) : 1
      }
    };
  });
}

export async function getTaskById(taskId: string, actor: { userId: string; role: string }) {
  await ensureCrmTasksSchema();

  return withDbClient(async (client) => {
    const params: unknown[] = [Number(taskId)];
    const whereParts = ["t.id = $1", "t.is_deleted = false"];
    const scopeClause = getScopeClause(actor.role, actor.userId, params);
    if (scopeClause) {
      whereParts.push(scopeClause.slice(5));
    }

    const taskResult = await client.query<TaskRow>(
      `
        ${TASK_SELECT}
        where ${whereParts.join(" and ")}
        limit 1
      `,
      params
    );

    if (!taskResult.rows.length) {
      throw new Error("Task not found.");
    }

    const activityResult = await client.query<TaskActivityRow>(
      `
        select
          a.activity_type,
          a.activity_text,
          a.created_at::text as created_at,
          u.name as created_by_name
        from crm_task_activities a
        left join users u on u.id = a.created_by
        where a.task_id = $1
        order by a.created_at desc
      `,
      [Number(taskId)]
    );

    return {
      ...mapTaskRow(taskResult.rows[0]),
      activityHistory: activityResult.rows.map((row) => ({
        type: row.activity_type,
        text: row.activity_text,
        at: row.created_at,
        by: row.created_by_name
      }))
    };
  });
}

export async function createTask(payload: CreateTaskPayload, actor: { userId: string; role: string }) {
  await ensureCrmTasksSchema();

  return withDbClient(async (client) => {
    const title = getRequiredString(payload.title, "Title");
    const description = getOptionalString(payload.description);
    const type = getValidatedValue(payload.type, "Type", CRM_TASK_TYPES);
    const status = getValidatedValue(payload.status, "Status", CRM_TASK_STATUSES, "Pending");
    const priority = getValidatedValue(payload.priority, "Priority", CRM_TASK_PRIORITIES, "Medium");
    const dueDate = getOptionalDate(payload.dueDate, "Due date");
    const requestedAssignedTo = getOptionalInteger(payload.assignedTo, "Assigned user");
    const assignedTo = isElevatedRole(actor.role) ? requestedAssignedTo ?? Number(actor.userId) : Number(actor.userId);
    const leadId = getOptionalInteger(payload.leadId, "Lead");
    const projectId = getOptionalInteger(payload.projectId, "Project");
    const bookingId = getOptionalInteger(payload.bookingId, "Booking");
    const completedAt = status === "Completed" ? new Date().toISOString() : null;

    await ensureUserExists(client, assignedTo, "Assigned user");
    if (leadId) {
      await ensureLeadExists(client, leadId);
    }
    if (projectId) {
      await ensureProjectExists(client, projectId);
    }

    await client.query("begin");

    try {
      const result = await client.query<TaskRow>(
        `
          insert into crm_tasks (
            title,
            description,
            task_type,
            status,
            priority,
            due_date,
            completed_at,
            assigned_to,
            created_by,
            lead_id,
            project_id,
            booking_id,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
          returning
            id::text as id,
            title,
            description,
            task_type,
            status,
            priority,
            due_date::text as due_date,
            completed_at::text as completed_at,
            assigned_to::text as assigned_to,
            null::text as assigned_to_name,
            created_by::text as created_by,
            null::text as created_by_name,
            lead_id::text as lead_id,
            null::text as lead_name,
            project_id::text as project_id,
            null::text as project_name,
            booking_id::text as booking_id,
            created_at::text as created_at,
            updated_at::text as updated_at,
            is_deleted
        `,
        [title, description, type, status, priority, dueDate, completedAt, assignedTo, Number(actor.userId), leadId, projectId, bookingId]
      );

      await insertTaskActivity(client, Number(result.rows[0].id), "Created", "Task created.", Number(actor.userId), {
        assignedTo,
        status,
        priority
      });

      await createNotifications(
        [
          assignedTo !== Number(actor.userId)
            ? {
                userId: assignedTo,
                type: "task_assigned",
                title: "New task assigned",
                message: `"${title}" has been assigned to you.`,
                entityType: "task",
                entityId: result.rows[0].id
              }
            : null,
          {
            userId: Number(actor.userId),
            type: "task_created",
            title: "Task created",
            message: `Task "${title}" was created successfully.`,
            entityType: "task",
            entityId: result.rows[0].id
          }
        ].filter(Boolean) as Array<{
          userId: number;
          type: string;
          title: string;
          message: string;
          entityType: string;
          entityId: string;
        }>,
        client
      );

      await client.query("commit");
      return getTaskById(result.rows[0].id, actor);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function getExistingTaskForUpdate(client: Queryable, taskId: string) {
  const result = await client.query<TaskRow>(
    `
      ${TASK_SELECT}
      where t.id = $1 and t.is_deleted = false
      limit 1
    `,
    [Number(taskId)]
  );

  if (!result.rows.length) {
    throw new Error("Task not found.");
  }

  return result.rows[0];
}

function ensureCanAccessTask(task: TaskRow, actor: { userId: string; role: string }) {
  if (isElevatedRole(actor.role)) {
    return;
  }

  if (task.assigned_to !== actor.userId && task.created_by !== actor.userId) {
    throw new Error("You do not have permission to access this task.");
  }
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload, actor: { userId: string; role: string }) {
  await ensureCrmTasksSchema();

  return withDbClient(async (client) => {
    const existingTask = await getExistingTaskForUpdate(client, taskId);
    ensureCanAccessTask(existingTask, actor);

    const nextTitle = payload.title !== undefined ? getRequiredString(payload.title, "Title") : existingTask.title;
    const nextDescription = payload.description !== undefined ? getOptionalString(payload.description) : existingTask.description;
    const nextType =
      payload.type !== undefined ? getValidatedValue(payload.type, "Type", CRM_TASK_TYPES) : existingTask.task_type;
    const nextStatus =
      payload.status !== undefined ? getValidatedValue(payload.status, "Status", CRM_TASK_STATUSES) : existingTask.status;
    const nextPriority =
      payload.priority !== undefined ? getValidatedValue(payload.priority, "Priority", CRM_TASK_PRIORITIES) : existingTask.priority;
    const nextDueDate = payload.dueDate !== undefined ? getOptionalDate(payload.dueDate, "Due date") : existingTask.due_date;
    const requestedAssignedTo =
      payload.assignedTo !== undefined ? getOptionalInteger(payload.assignedTo, "Assigned user") : Number(existingTask.assigned_to);
    const nextAssignedTo = isElevatedRole(actor.role) ? requestedAssignedTo : Number(actor.userId);
    const nextLeadId = payload.leadId !== undefined ? getOptionalInteger(payload.leadId, "Lead") : Number(existingTask.lead_id || 0) || null;
    const nextProjectId =
      payload.projectId !== undefined ? getOptionalInteger(payload.projectId, "Project") : Number(existingTask.project_id || 0) || null;
    const nextBookingId =
      payload.bookingId !== undefined ? getOptionalInteger(payload.bookingId, "Booking") : Number(existingTask.booking_id || 0) || null;
    const nextCompletedAt =
      nextStatus === "Completed"
        ? existingTask.completed_at || new Date().toISOString()
        : null;

    if (nextAssignedTo === null) {
      throw new Error("Assigned user is required.");
    }

    await ensureUserExists(client, nextAssignedTo, "Assigned user");
    if (nextLeadId) {
      await ensureLeadExists(client, nextLeadId);
    }
    if (nextProjectId) {
      await ensureProjectExists(client, nextProjectId);
    }

    await client.query("begin");

    try {
      await client.query(
        `
          update crm_tasks
          set
            title = $2,
            description = $3,
            task_type = $4,
            status = $5,
            priority = $6,
            due_date = $7,
            completed_at = $8,
            assigned_to = $9,
            lead_id = $10,
            project_id = $11,
            booking_id = $12,
            updated_at = now()
          where id = $1
        `,
        [
          Number(taskId),
          nextTitle,
          nextDescription,
          nextType,
          nextStatus,
          nextPriority,
          nextDueDate,
          nextCompletedAt,
          nextAssignedTo,
          nextLeadId,
          nextProjectId,
          nextBookingId
        ]
      );

      await insertTaskActivity(client, Number(taskId), "Updated", "Task updated.", Number(actor.userId), {
        status: nextStatus,
        priority: nextPriority,
        assignedTo: nextAssignedTo
      });

      await createNotifications(
        [
          nextAssignedTo !== Number(existingTask.assigned_to)
            ? {
                userId: nextAssignedTo,
                type: "task_reassigned",
                title: "Task assigned to you",
                message: `"${nextTitle}" has been assigned to you.`,
                entityType: "task",
                entityId: taskId
              }
            : null,
          nextStatus === "Completed" && existingTask.created_by !== actor.userId && existingTask.created_by !== existingTask.assigned_to
            ? {
                userId: Number(existingTask.created_by),
                type: "task_completed",
                title: "Task completed",
                message: `"${nextTitle}" was marked completed.`,
                entityType: "task",
                entityId: taskId
              }
            : null
        ].filter(Boolean) as Array<{
          userId: number;
          type: string;
          title: string;
          message: string;
          entityType: string;
          entityId: string;
        }>,
        client
      );

      await client.query("commit");
      return getTaskById(taskId, actor);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

export async function completeTask(taskId: string, actor: { userId: string; role: string }) {
  return updateTask(taskId, { status: "Completed" }, actor);
}

export async function deleteTask(taskId: string, actor: { userId: string; role: string }) {
  await ensureCrmTasksSchema();

  return withDbClient(async (client) => {
    const existingTask = await getExistingTaskForUpdate(client, taskId);
    ensureCanAccessTask(existingTask, actor);

    await client.query("begin");

    try {
      await client.query("update crm_tasks set is_deleted = true, updated_at = now() where id = $1", [Number(taskId)]);
      await insertTaskActivity(client, Number(taskId), "Deleted", "Task deleted.", Number(actor.userId));
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

export async function getTaskSummary(actor: { userId: string; role: string }) {
  await ensureCrmTasksSchema();

  return withDbClient(async (client) => {
    const params: unknown[] = [Number(actor.userId)];

    const [countResult, upcomingResult] = await Promise.all([
      client.query<{
        due_today: string;
        overdue: string;
        completed_today: string;
      }>(
        `
          select
            count(*) filter (
              where t.is_deleted = false
                and t.assigned_to = $1
                and t.status <> 'Completed'
                and t.due_date is not null
                and t.due_date::date = current_date
            )::text as due_today,
            count(*) filter (
              where t.is_deleted = false
                and t.assigned_to = $1
                and t.status <> 'Completed'
                and t.due_date is not null
                and t.due_date < now()
            )::text as overdue,
            count(*) filter (
              where t.is_deleted = false
                and t.assigned_to = $1
                and t.status = 'Completed'
                and t.completed_at is not null
                and t.completed_at::date = current_date
            )::text as completed_today
          from crm_tasks t
        `,
        params
      ),
      client.query<TaskRow>(
        `
          ${TASK_SELECT}
          where t.is_deleted = false
            and t.assigned_to = $1
            and t.status <> 'Completed'
          order by t.due_date asc nulls last, t.created_at desc
          limit 5
        `,
        params
      )
    ]);

    return {
      dueToday: Number(countResult.rows[0]?.due_today ?? 0),
      overdue: Number(countResult.rows[0]?.overdue ?? 0),
      completedToday: Number(countResult.rows[0]?.completed_today ?? 0),
      upcoming: upcomingResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        status: row.status,
        priority: row.priority
      }))
    };
  });
}

export async function getTaskMeta() {
  await ensureCrmTasksSchema();

  return {
    types: [...CRM_TASK_TYPES],
    statuses: [...CRM_TASK_STATUSES],
    priorities: [...CRM_TASK_PRIORITIES]
  };
}
