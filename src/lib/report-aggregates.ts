import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";
import { ensureCrmLeadsSchema } from "@/lib/crm-leads";
import { ensureCrmTasksSchema } from "@/lib/crm-tasks";
import { ensureProjectsEntitySchema } from "@/lib/projects-entity";

type ReportActor = {
  userId: string;
  role: string;
};

export type ReportFilters = {
  fromDate?: string | null;
  toDate?: string | null;
  projectId?: string | null;
  agentId?: string | null;
};

type CountRow = {
  count: string;
};

type RevenueRow = {
  total: string | null;
};

type SourcePerformanceRow = {
  source_name: string;
  total_leads: string;
  converted_leads: string;
};

type AgentPerformanceRow = {
  agent_id: string;
  agent_name: string;
  total_leads_assigned: string;
  site_visits_done: string;
  bookings_closed: string;
  revenue_generated: string | null;
};

type ProjectPerformanceRow = {
  project_id: string;
  project_name: string;
  total_leads: string;
  site_visits: string;
  bookings: string;
  revenue: string | null;
};

type RevenueByMonthRow = {
  month: string;
  revenue: string | null;
  bookings: string;
};

type TaskTypeRow = {
  type: string;
  total: string;
};

type TaskUserRow = {
  user: string;
  total: string;
};

function parsePositiveInteger(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeNumber(value: string | null | undefined) {
  return Number(value ?? 0);
}

export function parseReportFilters(request: Request): ReportFilters {
  const url = new URL(request.url);
  return {
    fromDate: url.searchParams.get("fromDate"),
    toDate: url.searchParams.get("toDate"),
    projectId: url.searchParams.get("projectId"),
    agentId: url.searchParams.get("agentId")
  };
}

async function ensureReportSchema() {
  await ensureCrmAuthSchema();
  await ensureCrmLeadsSchema();
  await ensureCrmTasksSchema();
  await ensureProjectsEntitySchema();
}

function appendLeadFilters(filters: ReportFilters, params: unknown[], columnPrefix = "l") {
  const whereParts: string[] = [];

  if (filters.fromDate) {
    params.push(filters.fromDate);
    whereParts.push(`${columnPrefix}.lead_date >= $${params.length}::date`);
  }

  if (filters.toDate) {
    params.push(filters.toDate);
    whereParts.push(`${columnPrefix}.lead_date <= $${params.length}::date`);
  }

  const projectId = parsePositiveInteger(filters.projectId);
  if (projectId) {
    params.push(projectId);
    whereParts.push(`${columnPrefix}.project_id = $${params.length}`);
  }

  const agentId = parsePositiveInteger(filters.agentId);
  if (agentId) {
    params.push(agentId);
    whereParts.push(`coalesce(${columnPrefix}.telecaller_id, ${columnPrefix}.assigned_to) = $${params.length}`);
  }

  return whereParts;
}

function appendVisitLeadFilters(filters: ReportFilters, params: unknown[], visitAlias = "v", leadAlias = "l") {
  const whereParts: string[] = [];

  if (filters.fromDate) {
    params.push(filters.fromDate);
    whereParts.push(`${visitAlias}.visit_date::date >= $${params.length}::date`);
  }

  if (filters.toDate) {
    params.push(filters.toDate);
    whereParts.push(`${visitAlias}.visit_date::date <= $${params.length}::date`);
  }

  const projectId = parsePositiveInteger(filters.projectId);
  if (projectId) {
    params.push(projectId);
    whereParts.push(`coalesce(${visitAlias}.project_id, ${leadAlias}.project_id) = $${params.length}`);
  }

  const agentId = parsePositiveInteger(filters.agentId);
  if (agentId) {
    params.push(agentId);
    whereParts.push(`coalesce(${leadAlias}.telecaller_id, ${leadAlias}.assigned_to) = $${params.length}`);
  }

  return whereParts;
}

function appendTaskFilters(filters: ReportFilters, actor: ReportActor, params: unknown[]) {
  const whereParts = ["t.is_deleted = false"];

  if (filters.fromDate) {
    params.push(filters.fromDate);
    whereParts.push(`t.due_date::date >= $${params.length}::date`);
  }

  if (filters.toDate) {
    params.push(filters.toDate);
    whereParts.push(`t.due_date::date <= $${params.length}::date`);
  }

  const projectId = parsePositiveInteger(filters.projectId);
  if (projectId) {
    params.push(projectId);
    whereParts.push(`t.project_id = $${params.length}`);
  }

  const agentId = parsePositiveInteger(filters.agentId);
  if (agentId) {
    params.push(agentId);
    whereParts.push(`t.assigned_to = $${params.length}`);
  }

  if (actor.role !== "Admin" && actor.role !== "SalesManager") {
    params.push(Number(actor.userId));
    whereParts.push(`(t.assigned_to = $${params.length} or t.created_by = $${params.length})`);
  }

  return whereParts;
}

export async function getLeadSummaryReport(filters: ReportFilters) {
  await ensureReportSchema();

  return withDbClient(async (client) => {
    const totalParams: unknown[] = [];
    const leadFilters = appendLeadFilters(filters, totalParams, "l");
    const leadWhere = [`l.is_deleted = false`, ...leadFilters].join(" and ");

    const [totalResult, newResult, convertedResult, lostResult] = await Promise.all([
      client.query<CountRow>(`select count(*)::text as count from crm_leads l where ${leadWhere}`, totalParams),
      client.query<CountRow>(
        `
          select count(*)::text as count
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          where ${leadWhere} and st.slug = 'new'
        `,
        totalParams
      ),
      client.query<CountRow>(
        `
          select count(*)::text as count
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          where ${leadWhere} and st.slug = 'booking-confirmed'
        `,
        totalParams
      ),
      client.query<CountRow>(
        `
          select count(*)::text as count
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          where ${leadWhere} and st.slug = 'lost'
        `,
        totalParams
      )
    ]);

    const totalLeads = Number(totalResult.rows[0]?.count ?? 0);
    const convertedLeads = Number(convertedResult.rows[0]?.count ?? 0);

    return {
      totalLeads,
      newLeads: Number(newResult.rows[0]?.count ?? 0),
      convertedLeads,
      lostLeads: Number(lostResult.rows[0]?.count ?? 0),
      conversionRate: totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0
    };
  });
}

export async function getSourcePerformanceReport(filters: ReportFilters) {
  await ensureReportSchema();

  return withDbClient(async (client) => {
    const params: unknown[] = [];
    const leadFilters = appendLeadFilters(filters, params, "l");
    const rows = await client.query<SourcePerformanceRow>(
      `
        select
          s.name as source_name,
          count(l.id)::text as total_leads,
          count(*) filter (where st.slug = 'booking-confirmed')::text as converted_leads
        from crm_lead_sources s
        left join crm_leads l on l.source_id = s.id and l.is_deleted = false${leadFilters.length ? ` and ${leadFilters.join(" and ")}` : ""}
        left join crm_lead_statuses st on st.id = l.status_id
        group by s.id, s.name
        having count(l.id) > 0
        order by count(l.id) desc, s.name asc
      `,
      params
    );

    return rows.rows.map((row) => {
      const totalLeads = Number(row.total_leads);
      const convertedLeads = Number(row.converted_leads);
      return {
        sourceName: row.source_name,
        totalLeads,
        convertedLeads,
        conversionRate: totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0
      };
    });
  });
}

export async function getAgentPerformanceReport(filters: ReportFilters) {
  await ensureReportSchema();

  return withDbClient(async (client) => {
    const leadParams: unknown[] = [];
    const leadFilters = appendLeadFilters(filters, leadParams, "l");
    const visitParams: unknown[] = [];
    const visitFilters = appendVisitLeadFilters(filters, visitParams, "v", "l");
    const leadRows = await client.query<AgentPerformanceRow>(
      `
        select
          u.id::text as agent_id,
          u.name as agent_name,
          count(l.id)::text as total_leads_assigned,
          '0'::text as site_visits_done,
          count(*) filter (where st.slug = 'booking-confirmed')::text as bookings_closed,
          coalesce(sum(case when st.slug = 'booking-confirmed' then coalesce(p.price_amount, p.rent_amount, 0) else 0 end), 0)::text as revenue_generated
        from users u
        left join crm_leads l on coalesce(l.telecaller_id, l.assigned_to) = u.id and l.is_deleted = false${leadFilters.length ? ` and ${leadFilters.join(" and ")}` : ""}
        left join crm_lead_statuses st on st.id = l.status_id
        left join properties p on p.id = l.project_id
        group by u.id, u.name
        having count(l.id) > 0
        order by count(l.id) desc, u.name asc
      `,
      leadParams
    );
    const visitRows = await client.query<{ agent_id: string; site_visits_done: string }>(
      `
        select
          coalesce(l.telecaller_id, l.assigned_to)::text as agent_id,
          count(v.id)::text as site_visits_done
        from crm_lead_visits v
        join crm_leads l on l.id = v.lead_id and l.is_deleted = false
        where coalesce(l.telecaller_id, l.assigned_to) is not null${visitFilters.length ? ` and ${visitFilters.join(" and ")}` : ""}
        group by coalesce(l.telecaller_id, l.assigned_to)
      `,
      visitParams
    );
    const visitMap = new Map(visitRows.rows.map((row) => [row.agent_id, Number(row.site_visits_done)]));

    return leadRows.rows.map((row) => {
      const totalLeadsAssigned = Number(row.total_leads_assigned);
      const bookingsClosed = Number(row.bookings_closed);
      return {
        agentId: row.agent_id,
        agentName: row.agent_name,
        totalLeadsAssigned,
        siteVisitsDone: Number(visitMap.get(row.agent_id) ?? 0),
        bookingsClosed,
        conversionRate: totalLeadsAssigned > 0 ? Number(((bookingsClosed / totalLeadsAssigned) * 100).toFixed(2)) : 0,
        revenueGenerated: normalizeNumber(row.revenue_generated)
      };
    });
  });
}

export async function getProjectPerformanceReport(filters: ReportFilters) {
  await ensureReportSchema();

  return withDbClient(async (client) => {
    const leadParams: unknown[] = [];
    const leadFilters = appendLeadFilters(filters, leadParams, "l");
    const visitParams: unknown[] = [];
    const visitFilters = appendVisitLeadFilters(filters, visitParams, "v", "l");
    const leadRows = await client.query<ProjectPerformanceRow>(
      `
        select
          p.id::text as project_id,
          p.title as project_name,
          count(l.id)::text as total_leads,
          '0'::text as site_visits,
          count(*) filter (where st.slug = 'booking-confirmed')::text as bookings,
          coalesce(sum(case when st.slug = 'booking-confirmed' then coalesce(p.price_amount, p.rent_amount, 0) else 0 end), 0)::text as revenue
        from properties p
        left join crm_leads l on l.project_id = p.id and l.is_deleted = false${leadFilters.length ? ` and ${leadFilters.join(" and ")}` : ""}
        left join crm_lead_statuses st on st.id = l.status_id
        where p.deleted_at is null
        group by p.id, p.title
        having count(l.id) > 0
        order by count(l.id) desc, p.title asc
      `,
      leadParams
    );
    const visitRows = await client.query<{ project_id: string; site_visits: string }>(
      `
        select
          coalesce(v.project_id, l.project_id)::text as project_id,
          count(v.id)::text as site_visits
        from crm_lead_visits v
        join crm_leads l on l.id = v.lead_id and l.is_deleted = false
        where coalesce(v.project_id, l.project_id) is not null${visitFilters.length ? ` and ${visitFilters.join(" and ")}` : ""}
        group by coalesce(v.project_id, l.project_id)
      `,
      visitParams
    );
    const visitMap = new Map(visitRows.rows.map((row) => [row.project_id, Number(row.site_visits)]));

    return leadRows.rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      totalLeads: Number(row.total_leads),
      siteVisits: Number(visitMap.get(row.project_id) ?? 0),
      bookings: Number(row.bookings),
      revenue: normalizeNumber(row.revenue)
    }));
  });
}

export async function getSalesSummaryReport(filters: ReportFilters) {
  await ensureReportSchema();

  return withDbClient(async (client) => {
    const params: unknown[] = [];
    const leadFilters = appendLeadFilters(filters, params, "l");
    const leadWhere = [`l.is_deleted = false`, ...leadFilters].join(" and ");

    const [bookingCountResult, revenueResult, negotiationResult, revenueByMonthResult] = await Promise.all([
      client.query<CountRow>(
        `
          select count(*)::text as count
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          where ${leadWhere} and st.slug = 'booking-confirmed'
        `,
        params
      ),
      client.query<RevenueRow>(
        `
          select coalesce(sum(coalesce(p.price_amount, p.rent_amount, 0)), 0)::text as total
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          left join properties p on p.id = l.project_id
          where ${leadWhere} and st.slug = 'booking-confirmed'
        `,
        params
      ),
      client.query<RevenueRow>(
        `
          select coalesce(sum(coalesce(p.price_amount, p.rent_amount, 0)), 0)::text as total
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          left join properties p on p.id = l.project_id
          where ${leadWhere} and st.slug = 'negotiation'
        `,
        params
      ),
      client.query<RevenueByMonthRow>(
        `
          select
            to_char(date_trunc('month', l.created_at), 'YYYY-MM') as month,
            coalesce(sum(coalesce(p.price_amount, p.rent_amount, 0)), 0)::text as revenue,
            count(*)::text as bookings
          from crm_leads l
          join crm_lead_statuses st on st.id = l.status_id
          left join properties p on p.id = l.project_id
          where ${leadWhere} and st.slug = 'booking-confirmed'
          group by date_trunc('month', l.created_at)
          order by date_trunc('month', l.created_at) asc
        `,
        params
      )
    ]);

    const totalBookings = Number(bookingCountResult.rows[0]?.count ?? 0);
    const totalRevenue = normalizeNumber(revenueResult.rows[0]?.total);

    return {
      totalBookings,
      totalRevenue,
      averageDealSize: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
      pendingPayments: normalizeNumber(negotiationResult.rows[0]?.total),
      bookingsThisMonth: revenueByMonthResult.rows.length ? Number(revenueByMonthResult.rows[revenueByMonthResult.rows.length - 1].bookings) : 0,
      revenueByMonth: revenueByMonthResult.rows.map((row) => ({
        month: row.month,
        revenue: normalizeNumber(row.revenue),
        bookings: Number(row.bookings)
      }))
    };
  });
}

export async function getTaskSummaryReport(filters: ReportFilters, actor: ReportActor) {
  await ensureReportSchema();

  return withDbClient(async (client) => {
    const params: unknown[] = [];
    const whereParts = appendTaskFilters(filters, actor, params);
    const whereClause = whereParts.join(" and ");

    const [totalResult, completedResult, overdueResult, typeRows, userRows] = await Promise.all([
      client.query<CountRow>(`select count(*)::text as count from crm_tasks t where ${whereClause}`, params),
      client.query<CountRow>(`select count(*)::text as count from crm_tasks t where ${whereClause} and t.status = 'Completed'`, params),
      client.query<CountRow>(
        `select count(*)::text as count from crm_tasks t where ${whereClause} and t.status <> 'Completed' and t.due_date < now()`,
        params
      ),
      client.query<TaskTypeRow>(
        `
          select
            t.task_type as type,
            count(*)::text as total
          from crm_tasks t
          where ${whereClause}
          group by t.task_type
          order by count(*) desc, t.task_type asc
        `,
        params
      ),
      client.query<TaskUserRow>(
        `
          select
            u.name as user,
            count(*)::text as total
          from crm_tasks t
          join users u on u.id = t.assigned_to
          where ${whereClause}
          group by u.id, u.name
          order by count(*) desc, u.name asc
        `,
        params
      )
    ]);

    return {
      totalTasks: Number(totalResult.rows[0]?.count ?? 0),
      completedTasks: Number(completedResult.rows[0]?.count ?? 0),
      overdueTasks: Number(overdueResult.rows[0]?.count ?? 0),
      tasksByType: typeRows.rows.map((row) => ({
        type: row.type,
        total: Number(row.total)
      })),
      tasksByUser: userRows.rows.map((row) => ({
        user: row.user,
        total: Number(row.total)
      }))
    };
  });
}
