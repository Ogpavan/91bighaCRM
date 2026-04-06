import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";
import { ensureCrmLeadsSchema } from "@/lib/crm-leads";
import { ensureCrmTasksSchema, getTaskSummary } from "@/lib/crm-tasks";
import { ensureProjectsEntitySchema } from "@/lib/projects-entity";

type DashboardActor = {
  userId: string;
  role: string;
  permissions: string[];
};

type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type CountRow = {
  count: string;
};

type LabeledCountRow = {
  label: string;
  count: string;
};

type RecentLeadRow = {
  id: string;
  name: string;
  status_name: string;
  source_name: string;
  telecaller_name: string | null;
  project_name: string | null;
  lead_date: string;
  recall_date: string | null;
  created_at: string;
};

const DEFAULT_TASK_SUMMARY = {
  dueToday: 0,
  overdue: 0,
  completedToday: 0,
  upcoming: []
};

function isElevatedRole(role: string) {
  return role === "Admin" || role === "SalesManager";
}

function hasPermission(actor: DashboardActor, permissionKey: string) {
  return actor.permissions.includes(permissionKey);
}

function mapLabeledCounts(rows: LabeledCountRow[]) {
  return rows.map((row) => ({
    label: row.label,
    count: Number(row.count)
  }));
}

function getTaskScopeClause(actor: DashboardActor, params: unknown[]) {
  if (isElevatedRole(actor.role)) {
    return "";
  }

  params.push(Number(actor.userId));
  return ` and (t.assigned_to = $${params.length} or t.created_by = $${params.length})`;
}

async function getWorkspaceSummary(client: Queryable) {
  const [usersResult, activeUsersResult, teamsResult, rolesResult, projectsResult, activeProjectsResult, propertiesResult, propertyTypesResult, roleBreakdownResult, propertyTypeBreakdownResult] =
    await Promise.all([
      client.query<CountRow>("select count(*)::text as count from users"),
      client.query<CountRow>("select count(*)::text as count from users where is_active = true"),
      client.query<CountRow>("select count(*)::text as count from teams"),
      client.query<CountRow>("select count(*)::text as count from roles"),
      client.query<CountRow>("select count(*)::text as count from projects"),
      client.query<CountRow>("select count(*)::text as count from projects where lower(status) = 'active'"),
      client.query<CountRow>("select count(*)::text as count from properties where deleted_at is null"),
      client.query<CountRow>("select count(*)::text as count from property_types"),
      client.query<LabeledCountRow>(
        `
          select
            r.name as label,
            count(u.id)::text as count
          from roles r
          left join users u on u.role_id = r.id
          group by r.id, r.name
          having count(u.id) > 0
          order by count(u.id) desc, r.name asc
          limit 6
        `
      ),
      client.query<LabeledCountRow>(
        `
          select
            pt.name as label,
            count(p.id)::text as count
          from property_types pt
          left join properties p on p.property_type_id = pt.id and p.deleted_at is null
          group by pt.id, pt.name
          having count(p.id) > 0
          order by count(p.id) desc, pt.name asc
          limit 6
        `
      )
    ]);

  return {
    users: Number(usersResult.rows[0]?.count ?? 0),
    activeUsers: Number(activeUsersResult.rows[0]?.count ?? 0),
    teams: Number(teamsResult.rows[0]?.count ?? 0),
    roles: Number(rolesResult.rows[0]?.count ?? 0),
    projects: Number(projectsResult.rows[0]?.count ?? 0),
    activeProjects: Number(activeProjectsResult.rows[0]?.count ?? 0),
    properties: Number(propertiesResult.rows[0]?.count ?? 0),
    propertyTypes: Number(propertyTypesResult.rows[0]?.count ?? 0),
    roleBreakdown: mapLabeledCounts(roleBreakdownResult.rows),
    propertyTypeBreakdown: mapLabeledCounts(propertyTypeBreakdownResult.rows)
  };
}

async function getLeadSummary(client: Queryable) {
  const [totalResult, addedTodayResult, recallTodayResult, statusBreakdownResult, sourceBreakdownResult, recentLeadsResult] = await Promise.all([
    client.query<CountRow>("select count(*)::text as count from crm_leads where is_deleted = false"),
    client.query<CountRow>("select count(*)::text as count from crm_leads where is_deleted = false and lead_date::date = current_date"),
    client.query<CountRow>("select count(*)::text as count from crm_leads where is_deleted = false and recall_date::date = current_date"),
    client.query<LabeledCountRow>(
      `
        select
          st.name as label,
          count(l.id)::text as count
        from crm_leads l
        join crm_lead_statuses st on st.id = l.status_id
        where l.is_deleted = false
        group by st.id, st.name, st.sort_order
        order by st.sort_order asc, st.name asc
      `
    ),
    client.query<LabeledCountRow>(
      `
        select
          s.name as label,
          count(l.id)::text as count
        from crm_leads l
        join crm_lead_sources s on s.id = l.source_id
        where l.is_deleted = false
        group by s.id, s.name
        order by count(l.id) desc, s.name asc
        limit 6
      `
    ),
    client.query<RecentLeadRow>(
      `
        select
          l.id::text as id,
          l.name,
          st.name as status_name,
          s.name as source_name,
          telecaller.name as telecaller_name,
          p.title as project_name,
          l.lead_date::text as lead_date,
          l.recall_date::text as recall_date,
          l.created_at::text as created_at
        from crm_leads l
        join crm_lead_statuses st on st.id = l.status_id
        join crm_lead_sources s on s.id = l.source_id
        left join users telecaller on telecaller.id = coalesce(l.telecaller_id, l.assigned_to)
        left join properties p on p.id = l.project_id
        where l.is_deleted = false
        order by l.created_at desc
        limit 6
      `
    )
  ]);

  return {
    total: Number(totalResult.rows[0]?.count ?? 0),
    addedToday: Number(addedTodayResult.rows[0]?.count ?? 0),
    recallToday: Number(recallTodayResult.rows[0]?.count ?? 0),
    statusBreakdown: mapLabeledCounts(statusBreakdownResult.rows),
    sourceBreakdown: mapLabeledCounts(sourceBreakdownResult.rows),
    recent: recentLeadsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      statusName: row.status_name,
      sourceName: row.source_name,
      telecallerName: row.telecaller_name,
      projectName: row.project_name,
      leadDate: row.lead_date,
      recallDate: row.recall_date,
      createdAt: row.created_at
    }))
  };
}

async function getTaskBoardSummary(client: Queryable, actor: DashboardActor) {
  const taskSummary = await getTaskSummary(actor);
  const params: unknown[] = [];
  const scopeClause = getTaskScopeClause(actor, params);
  const statusCountsResult = await client.query<LabeledCountRow>(
    `
      select
        t.status as label,
        count(*)::text as count
      from crm_tasks t
      where t.is_deleted = false${scopeClause}
      group by t.status
      order by count(*) desc, t.status asc
    `,
    params
  );

  const statusMap = new Map(statusCountsResult.rows.map((row) => [row.label, Number(row.count)]));

  return {
    dueToday: Number(taskSummary.dueToday ?? 0),
    overdue: Number(taskSummary.overdue ?? 0),
    completedToday: Number(taskSummary.completedToday ?? 0),
    pending: Number(statusMap.get("Pending") ?? 0),
    inProgress: Number(statusMap.get("In Progress") ?? 0),
    completed: Number(statusMap.get("Completed") ?? 0),
    cancelled: Number(statusMap.get("Cancelled") ?? 0),
    upcoming: Array.isArray(taskSummary.upcoming) ? taskSummary.upcoming : DEFAULT_TASK_SUMMARY.upcoming
  };
}

export async function getDashboardSummary(actor: DashboardActor) {
  await ensureCrmAuthSchema();
  await ensureCrmLeadsSchema();
  await ensureCrmTasksSchema();
  await ensureProjectsEntitySchema();

  return withDbClient(async (client) => {
    const summary: {
      role: string;
      permissions: string[];
      tasks: null | Awaited<ReturnType<typeof getTaskBoardSummary>>;
      leads: null | Awaited<ReturnType<typeof getLeadSummary>>;
      workspace: null | Awaited<ReturnType<typeof getWorkspaceSummary>>;
    } = {
      role: actor.role,
      permissions: actor.permissions,
      tasks: null,
      leads: null,
      workspace: null
    };

    if (hasPermission(actor, "view_tasks")) {
      summary.tasks = await getTaskBoardSummary(client, actor);
    }

    if (hasPermission(actor, "view_leads")) {
      summary.leads = await getLeadSummary(client);
    }

    if (hasPermission(actor, "view_dashboard")) {
      summary.workspace = await getWorkspaceSummary(client);
    }

    return summary;
  });
}
