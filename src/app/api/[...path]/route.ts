import { NextRequest } from "next/server";
import { createCorsPreflightResponse, setCorsHeaders } from "@/lib/cors";
import {
  AuthError,
  ensureCrmAuthSchema,
  getRoleByName,
  hashPassword,
  requireAuth,
  requirePermission
} from "@/lib/crm-auth";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import {
  addLeadFollowup,
  addLeadVisit,
  createLead,
  deleteLead,
  getLeadById,
  getLeadsMetadata,
  listLeadActivities,
  listLeadFollowups,
  listLeadVisits,
  listLeads,
  updateLead
} from "@/lib/crm-leads";
import { importLeadsFromFile, previewLeadImport } from "@/lib/crm-leads-import";
import {
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  getTaskMeta,
  getTaskSummary,
  listTasks,
  updateTask
} from "@/lib/crm-tasks";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotificationEvents
} from "@/lib/crm-notifications";
import { searchGlobal } from "@/lib/global-search";
import {
  getAgentPerformanceReport,
  getLeadSummaryReport,
  getProjectPerformanceReport,
  getSalesSummaryReport,
  getSourcePerformanceReport,
  getTaskSummaryReport,
  parseReportFilters
} from "@/lib/report-aggregates";
import { createProjectEntity, listProjectsEntity } from "@/lib/projects-entity";
import { createProperty, getPropertyTypeOptions, listApiProperties } from "@/lib/properties";
import { getAppSettings, updateAppSettings } from "@/lib/app-settings";
import { withDbClient } from "@/lib/db";
import { jsonResponse } from "@/lib/api-response";
import { getUploadsSubpath } from "@/lib/uploads";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import * as XLSX from "xlsx";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};
function notFound(request: Request) {
  return jsonResponse({ success: false, message: "Not found." }, 404, request);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid JSON payload.");
  }
}

async function parseForm(request: Request) {
  try {
    return await request.formData();
  } catch {
    throw new Error("Invalid form payload.");
  }
}

function ensureNumber(value: string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "0"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function buildErrorResponse(error: unknown, request: Request) {
  if (error instanceof AuthError) {
    return jsonResponse({ success: false, message: error.message }, error.status, request);
  }

  const message = error instanceof Error ? error.message : "Request failed.";
  return jsonResponse({ success: false, message }, 500, request);
}

async function handleDashboard(request: Request, method: string) {
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  const auth = requireAuth(request);
  const summary = await getDashboardSummary({
    userId: auth.userId,
    role: auth.role,
    permissions: auth.permissions
  });

  return jsonResponse({ success: true, summary }, 200, request);
}

function parseLeadFilters(request: Request) {
  const url = new URL(request.url);
  return {
    page: ensureNumber(url.searchParams.get("page"), 1),
    limit: ensureNumber(url.searchParams.get("limit"), 20),
    status: url.searchParams.get("status"),
    assignedTo: null,
    telecaller: url.searchParams.get("telecaller"),
    source: url.searchParams.get("source"),
    project: url.searchParams.get("project"),
    fromDate: url.searchParams.get("fromDate"),
    toDate: url.searchParams.get("toDate"),
    search: url.searchParams.get("search")
  };
}

async function handleLeads(request: Request, method: string, segments: string[]) {
  const auth = requireAuth(request);

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_leads");
      const filters = parseLeadFilters(request);
      const data = await listLeads(filters, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items: data.items, pagination: data.pagination }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "create_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const lead = await createLead(payload, auth.userId);
      return jsonResponse({ success: true, lead }, 201, request);
    }
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  if (segments[2] === "meta" && method === "GET") {
    requirePermission(request, "view_leads");
    const meta = await getLeadsMetadata();
    return jsonResponse(
      {
        success: true,
        statuses: meta.statuses,
        sources: meta.sources,
        telecallers: meta.telecallers,
        projects: meta.projects
      },
      200,
      request
    );
  }

  if (segments[2] === "import") {
    requirePermission(request, "create_leads");
    if (segments[3] === "preview" && method === "POST") {
      const form = await parseForm(request);
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonResponse({ success: false, message: "File is required." }, 400, request);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const preview = await previewLeadImport(buffer);
      return jsonResponse({ success: true, ...preview }, 200, request);
    }

    if (!segments[3] && method === "POST") {
      const form = await parseForm(request);
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonResponse({ success: false, message: "File is required." }, 400, request);
      }

      const mappings: Partial<Record<string, string>> = {};
      for (const [key, value] of form.entries()) {
        if (key.startsWith("mapping_") && typeof value === "string") {
          mappings[key.replace("mapping_", "")] = value;
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await importLeadsFromFile({
        fileBuffer: buffer,
        mappings,
        defaultSourceId: form.get("defaultSourceId") ? Number(form.get("defaultSourceId")) : null,
        defaultStatusId: form.get("defaultStatusId") ? Number(form.get("defaultStatusId")) : null,
        actorUserId: auth.userId
      });

      return jsonResponse(
        {
          success: true,
          importedCount: result.importedCount,
          failedCount: result.failedCount,
          errors: result.errors,
          message: result.failedCount ? "Some rows failed to import." : "Import completed."
        },
        200,
        request
      );
    }
  }

  const leadId = segments[2];
  if (!leadId) {
    return notFound(request);
  }

  if (segments.length === 3) {
    if (method === "GET") {
      requirePermission(request, "view_leads");
      const lead = await getLeadById(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, lead }, 200, request);
    }
    if (method === "PUT") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const lead = await updateLead(leadId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, lead }, 200, request);
    }
    if (method === "DELETE") {
      requirePermission(request, "delete_leads");
      await deleteLead(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, message: "Lead deleted." }, 200, request);
    }
  }

  if (segments[3] === "followups") {
    requirePermission(request, "view_leads");
    if (method === "GET") {
      const items = await listLeadFollowups(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const followup = await addLeadFollowup(leadId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, followup }, 201, request);
    }
  }

  if (segments[3] === "visits") {
    requirePermission(request, "view_leads");
    if (method === "GET") {
      const items = await listLeadVisits(leadId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "edit_leads");
      const payload = await parseJson<Record<string, unknown>>(request);
      const visit = await addLeadVisit(leadId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, visit }, 201, request);
    }
  }

  if (segments[3] === "activities" && method === "GET") {
    requirePermission(request, "view_leads");
    const items = await listLeadActivities(leadId, { userId: auth.userId, role: auth.role });
    return jsonResponse({ success: true, items }, 200, request);
  }

  return notFound(request);
}
function parseTaskFilters(request: Request) {
  const url = new URL(request.url);
  return {
    page: ensureNumber(url.searchParams.get("page"), 1),
    limit: ensureNumber(url.searchParams.get("limit"), 20),
    assignedTo: url.searchParams.get("assignedTo"),
    status: url.searchParams.get("status"),
    priority: url.searchParams.get("priority"),
    type: url.searchParams.get("type"),
    fromDate: url.searchParams.get("fromDate"),
    toDate: url.searchParams.get("toDate"),
    leadId: url.searchParams.get("leadId"),
    projectId: url.searchParams.get("projectId")
  };
}

async function handleTasks(request: Request, method: string, segments: string[]) {
  const auth = requireAuth(request);

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_tasks");
      const filters = parseTaskFilters(request);
      const data = await listTasks(filters, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, items: data.items, pagination: data.pagination }, 200, request);
    }
    if (method === "POST") {
      requirePermission(request, "create_tasks");
      const payload = await parseJson<Record<string, unknown>>(request);
      const task = await createTask(payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, task }, 201, request);
    }
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  if (segments[2] === "summary" && method === "GET") {
    requirePermission(request, "view_tasks");
    const summary = await getTaskSummary({ userId: auth.userId, role: auth.role });
    return jsonResponse({ success: true, summary }, 200, request);
  }

  if (segments[2] === "meta" && method === "GET") {
    requirePermission(request, "view_tasks");
    const meta = await getTaskMeta();
    return jsonResponse({ success: true, ...meta }, 200, request);
  }

  const taskId = segments[2];
  if (!taskId) {
    return notFound(request);
  }

  if (segments.length === 3) {
    if (method === "GET") {
      requirePermission(request, "view_tasks");
      const task = await getTaskById(taskId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, task }, 200, request);
    }
    if (method === "PUT") {
      requirePermission(request, "edit_tasks");
      const payload = await parseJson<Record<string, unknown>>(request);
      const task = await updateTask(taskId, payload, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, task }, 200, request);
    }
    if (method === "DELETE") {
      requirePermission(request, "delete_tasks");
      await deleteTask(taskId, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, message: "Task deleted." }, 200, request);
    }
  }

  if (segments[3] === "complete" && method === "POST") {
    requirePermission(request, "edit_tasks");
    const task = await completeTask(taskId, { userId: auth.userId, role: auth.role });
    return jsonResponse({ success: true, task }, 200, request);
  }

  return notFound(request);
}

async function handleNotifications(request: Request, method: string, segments: string[]) {
  const auth = requireAuth(request);

  if (segments.length === 2 && method === "GET") {
    const url = new URL(request.url);
    const limit = ensureNumber(url.searchParams.get("limit"), 12);
    const data = await listNotifications(auth.userId, limit);
    return jsonResponse({ success: true, items: data.items, unreadCount: data.unreadCount }, 200, request);
  }

  if (segments[2] === "read-all" && method === "POST") {
    await markAllNotificationsRead(auth.userId);
    return jsonResponse({ success: true, message: "All notifications marked as read." }, 200, request);
  }

  if (segments[2] === "stream" && method === "GET") {
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    setCorsHeaders(headers, request);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (event: string, data: unknown) => {
          if (closed) {
            return;
          }
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const snapshot = await listNotifications(auth.userId, 12);
        send("snapshot", { items: snapshot.items, unreadCount: snapshot.unreadCount });

        const unsubscribe = subscribeToNotificationEvents(auth.userId, (event) => {
          send(event.type, event);
        });

        const heartbeat = setInterval(() => {
          send("heartbeat", { at: Date.now() });
        }, 15000);

        request.signal.addEventListener("abort", () => {
          if (closed) {
            return;
          }
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          controller.close();
        });
      }
    });

    return new Response(stream, { headers });
  }

  const notificationId = segments[2];
  if (notificationId && segments[3] === "read" && method === "POST") {
    const notification = await markNotificationRead(notificationId, auth.userId);
    return jsonResponse({ success: true, notification }, 200, request);
  }

  return notFound(request);
}

async function handleProjectsEntity(request: Request, method: string) {
  requirePermission(request, "view_leads");

  if (method === "GET") {
    const items = await listProjectsEntity();
    return jsonResponse({ success: true, items }, 200, request);
  }

  if (method === "POST") {
    requirePermission(request, "edit_leads");
    const payload = await parseJson<Record<string, unknown>>(request);
    const project = await createProjectEntity(payload);
    return jsonResponse({ success: true, project }, 201, request);
  }

  return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
}

async function handleReports(request: Request, method: string, segments: string[]) {
  requirePermission(request, "view_reports");
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }

  const auth = requireAuth(request);
  const filters = parseReportFilters(request);

  switch (segments[2]) {
    case "lead-summary": {
      const report = await getLeadSummaryReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "source-performance": {
      const report = await getSourcePerformanceReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "agent-performance": {
      const report = await getAgentPerformanceReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "project-performance": {
      const report = await getProjectPerformanceReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "sales-summary": {
      const report = await getSalesSummaryReport(filters);
      return jsonResponse({ success: true, report }, 200, request);
    }
    case "task-summary": {
      const report = await getTaskSummaryReport(filters, { userId: auth.userId, role: auth.role });
      return jsonResponse({ success: true, report }, 200, request);
    }
    default:
      return notFound(request);
  }
}

async function handleSearch(request: Request, method: string) {
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }
  const auth = requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const items = await searchGlobal(query, {
    userId: auth.userId,
    role: auth.role,
    permissions: auth.permissions
  });
  return jsonResponse({ success: true, items }, 200, request);
}

async function handleSettings(request: Request, method: string, segments: string[]) {
  if (segments[2] === "logo") {
    requirePermission(request, "manage_settings");
    if (method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
    }

    const form = await parseForm(request);
    const file = form.get("logo");
    if (!(file instanceof File)) {
      return jsonResponse({ success: false, message: "Logo file is required." }, 400, request);
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filename = `logo-${randomUUID()}.${ext}`;
    const brandingDir = getUploadsSubpath("branding");
    const targetPath = path.join(brandingDir, filename);
    await fs.mkdir(brandingDir, { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

    const settings = await updateAppSettings({ brand_logo_url: `/uploads/branding/${filename}` });
    return jsonResponse({ success: true, settings }, 200, request);
  }

  if (segments.length !== 2) {
    return notFound(request);
  }

  if (method === "GET") {
    requireAuth(request);
    const settings = await getAppSettings();
    return jsonResponse({ success: true, settings }, 200, request);
  }

  if (method === "PUT") {
    requirePermission(request, "manage_settings");
    const payload = await parseJson<Record<string, unknown>>(request);
    const settings = await updateAppSettings(payload);
    return jsonResponse({ success: true, settings }, 200, request);
  }

  return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
}
async function handleUsers(request: Request, method: string, segments: string[]) {
  await ensureCrmAuthSchema();
  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_users");
      const url = new URL(request.url);
      const page = ensureNumber(url.searchParams.get("page"), 1);
      const limit = ensureNumber(url.searchParams.get("limit"), 10);
      await ensureCrmAuthSchema();

      const offset = (page - 1) * limit;
      const data = await withDbClient(async (client) => {
        const [itemsResult, countResult] = await Promise.all([
          client.query<{
            id: string;
            name: string;
            email: string;
            phone: string | null;
            role_id: string;
            role: string;
            team_id: string | null;
            team_name: string | null;
            is_active: boolean;
            created_at: string;
          }>(
            `
              select
                u.id::text as id,
                u.name,
                u.email,
                u.phone,
                u.role_id::text as role_id,
                r.name as role,
                u.team_id::text as team_id,
                t.name as team_name,
                u.is_active,
                u.created_at::text as created_at
              from users u
              join roles r on r.id = u.role_id
              left join teams t on t.id = u.team_id
              order by u.created_at desc
              limit $1 offset $2
            `,
            [limit, offset]
          ),
          client.query<{ count: string }>("select count(*)::text as count from users")
        ]);

        const total = Number(countResult.rows[0]?.count ?? 0);
        return {
          items: itemsResult.rows.map((row) => ({
            id: row.id,
            fullName: row.name,
            email: row.email,
            phone: row.phone,
            roleId: Number(row.role_id),
            role: row.role,
            teamId: row.team_id,
            team: row.team_id ? { id: row.team_id, name: row.team_name || "" } : null,
            isActive: row.is_active,
            createdAt: row.created_at
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: total > 0 ? Math.ceil(total / limit) : 1
          }
        };
      });

      return jsonResponse({ success: true, items: data.items, pagination: data.pagination }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "manage_users");
      const payload = await parseJson<{
        fullName?: string;
        email?: string;
        phone?: string;
        password?: string;
        roleName?: string;
        teamId?: string;
        isActive?: boolean;
      }>(request);

      const fullName = String(payload.fullName || "").trim();
      const email = String(payload.email || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const roleName = String(payload.roleName || "").trim();

      if (!fullName || !email || !password || !roleName) {
        return jsonResponse({ success: false, message: "Name, email, password, and role are required." }, 400, request);
      }

      const role = await getRoleByName(roleName);
      if (!role) {
        return jsonResponse({ success: false, message: "Role not found." }, 400, request);
      }

      const passwordHash = hashPassword(password);
      const user = await withDbClient(async (client) => {
        const existing = await client.query<{ id: string }>(
          "select id::text as id from users where lower(email) = lower($1) limit 1",
          [email]
        );
        if (existing.rows.length) {
          throw new Error("An account with this email already exists.");
        }

        const result = await client.query<{
          id: string;
          name: string;
          email: string;
          phone: string | null;
          role_id: string;
          role: string;
          team_id: string | null;
          created_at: string;
          is_active: boolean;
        }>(
          `
            insert into users (name, email, phone, role, role_id, team_id, is_active, password_hash)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning
              id::text as id,
              name,
              email,
              phone,
              role_id::text as role_id,
              role,
              team_id::text as team_id,
              is_active,
              created_at::text as created_at
          `,
          [fullName, email, payload.phone || null, role.name, String(role.id), payload.teamId ? Number(payload.teamId) : null, payload.isActive !== false, passwordHash]
        );

        return result.rows[0];
      });

      return jsonResponse(
        {
          success: true,
          user: {
            id: user.id,
            fullName: user.name,
            email: user.email,
            phone: user.phone,
            roleId: Number(user.role_id),
            role: user.role,
            teamId: user.team_id,
            team: null,
            isActive: user.is_active,
            createdAt: user.created_at
          }
        },
        201,
        request
      );
    }
  }

  const userId = segments[2];
  if (!userId) {
    return notFound(request);
  }

  if (method === "DELETE") {
    requirePermission(request, "manage_users");
    await withDbClient(async (client) => {
      await client.query("update users set is_active = false where id = $1", [Number(userId)]);
    });
    return jsonResponse({ success: true, message: "User disabled." }, 200, request);
  }

  if (method === "PUT") {
    requirePermission(request, "manage_users");
    const payload = await parseJson<{ roleName?: string }>(request);
    if (!payload.roleName) {
      return jsonResponse({ success: false, message: "Role is required." }, 400, request);
    }

    const role = await getRoleByName(payload.roleName);
    if (!role) {
      return jsonResponse({ success: false, message: "Role not found." }, 400, request);
    }

    const user = await withDbClient(async (client) => {
      const result = await client.query<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role_id: string;
        role: string;
        team_id: string | null;
        is_active: boolean;
        created_at: string;
      }>(
        `
          update users
          set role = $2, role_id = $3
          where id = $1
          returning
            id::text as id,
            name,
            email,
            phone,
            role_id::text as role_id,
            role,
            team_id::text as team_id,
            is_active,
            created_at::text as created_at
        `,
        [Number(userId), role.name, Number(role.id)]
      );

      if (!result.rows.length) {
        throw new Error("User not found.");
      }
      return result.rows[0];
    });

    return jsonResponse(
      {
        success: true,
        user: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          phone: user.phone,
          roleId: Number(user.role_id),
          role: user.role,
          teamId: user.team_id,
          team: null,
          isActive: user.is_active,
          createdAt: user.created_at
        }
      },
      200,
      request
    );
  }

  return notFound(request);
}

async function handleRoles(request: Request, method: string, segments: string[]) {
  await ensureCrmAuthSchema();

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "manage_users");
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; slug: string; user_count: string }>(
          `
            select
              r.id::text as id,
              r.name,
              r.slug,
              count(u.id)::text as user_count
            from roles r
            left join users u on u.role_id = r.id
            group by r.id
            order by r.name asc
          `
        );
        return result.rows;
      });

      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "manage_users");
      const payload = await parseJson<{ name?: string }>(request);
      const name = String(payload.name || "").trim();
      if (!name) {
        return jsonResponse({ success: false, message: "Role name is required." }, 400, request);
      }

      const role = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; slug: string }>(
          `
            insert into roles (name, slug)
            values ($1, $2)
            returning id::text as id, name, slug
          `,
          [name, slugify(name)]
        );
        return result.rows[0];
      });

      return jsonResponse({ success: true, role }, 201, request);
    }
  }

  const roleId = segments[2];
  if (!roleId) {
    return notFound(request);
  }

  if (segments[3] === "permissions") {
    requirePermission(request, "manage_users");

    if (method === "GET") {
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ permission_key: string }>(
          `
            select p.permission_key
            from role_permissions rp
            join permissions p on p.id = rp.permission_id
            where rp.role_id = $1
            order by p.permission_key asc
          `,
          [Number(roleId)]
        );
        return result.rows.map((row) => row.permission_key);
      });

      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "PUT") {
      const payload = await parseJson<{ permissionKeys?: string[] }>(request);
      const permissionKeys = Array.isArray(payload.permissionKeys) ? payload.permissionKeys : [];
      await withDbClient(async (client) => {
        await client.query("delete from role_permissions where role_id = $1", [Number(roleId)]);
        if (!permissionKeys.length) {
          return;
        }
        await client.query(
          `
            insert into role_permissions (role_id, permission_id)
            select $1, p.id
            from permissions p
            where p.permission_key = any($2::text[])
          `,
          [Number(roleId), permissionKeys]
        );
      });

      return jsonResponse({ success: true, items: permissionKeys }, 200, request);
    }
  }

  if (method === "PUT") {
    requirePermission(request, "manage_users");
    const payload = await parseJson<{ name?: string }>(request);
    const name = String(payload.name || "").trim();
    if (!name) {
      return jsonResponse({ success: false, message: "Role name is required." }, 400, request);
    }

    const role = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; slug: string }>(
        `
          update roles
          set name = $2, slug = $3
          where id = $1
          returning id::text as id, name, slug
        `,
        [Number(roleId), name, slugify(name)]
      );

      if (!result.rows.length) {
        throw new Error("Role not found.");
      }
      return result.rows[0];
    });

    return jsonResponse({ success: true, role }, 200, request);
  }

  if (method === "DELETE") {
    requirePermission(request, "manage_users");
    await withDbClient(async (client) => {
      await client.query("delete from roles where id = $1", [Number(roleId)]);
    });
    return jsonResponse({ success: true, message: "Role deleted." }, 200, request);
  }

  return notFound(request);
}

async function handlePermissions(request: Request, method: string) {
  if (method !== "GET") {
    return jsonResponse({ success: false, message: "Method not allowed." }, 405, request);
  }
  requirePermission(request, "manage_users");
  await ensureCrmAuthSchema();
  const items = await withDbClient(async (client) => {
    const result = await client.query<{ permission_key: string; description: string | null }>(
      `
        select permission_key, description
        from permissions
        order by permission_key asc
      `
    );
    return result.rows.map((row) => ({
      key: row.permission_key,
      description: row.description
    }));
  });

  return jsonResponse({ success: true, items }, 200, request);
}

async function handleTeams(request: Request, method: string, segments: string[]) {
  await ensureCrmAuthSchema();

  if (segments.length === 2) {
    if (method === "GET") {
      requirePermission(request, "view_users");
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; description: string | null }>(
          `
            select id::text as id, name, description
            from teams
            order by name asc
          `
        );
        return result.rows;
      });
      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "POST") {
      requirePermission(request, "manage_users");
      const payload = await parseJson<{ name?: string; description?: string }>(request);
      const name = String(payload.name || "").trim();
      if (!name) {
        return jsonResponse({ success: false, message: "Team name is required." }, 400, request);
      }

      const team = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; description: string | null }>(
          `
            insert into teams (name, description, updated_at)
            values ($1, $2, now())
            returning id::text as id, name, description
          `,
          [name, payload.description || null]
        );
        return result.rows[0];
      });

      return jsonResponse({ success: true, team }, 201, request);
    }
  }

  const teamId = segments[2];
  if (!teamId) {
    return notFound(request);
  }

  if (segments[3] === "permissions") {
    requirePermission(request, "manage_users");
    if (method === "GET") {
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ permission_key: string }>(
          `
            select p.permission_key
            from team_permissions tp
            join permissions p on p.id = tp.permission_id
            where tp.team_id = $1
            order by p.permission_key asc
          `,
          [Number(teamId)]
        );
        return result.rows.map((row) => row.permission_key);
      });
      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "PUT") {
      const payload = await parseJson<{ permissionKeys?: string[] }>(request);
      const permissionKeys = Array.isArray(payload.permissionKeys) ? payload.permissionKeys : [];
      await withDbClient(async (client) => {
        await client.query("delete from team_permissions where team_id = $1", [Number(teamId)]);
        if (!permissionKeys.length) {
          return;
        }
        await client.query(
          `
            insert into team_permissions (team_id, permission_id)
            select $1, p.id
            from permissions p
            where p.permission_key = any($2::text[])
          `,
          [Number(teamId), permissionKeys]
        );
      });

      return jsonResponse({ success: true, items: permissionKeys }, 200, request);
    }
  }

  if (method === "PUT") {
    requirePermission(request, "manage_users");
    const payload = await parseJson<{ name?: string; description?: string }>(request);
    const name = payload.name ? String(payload.name).trim() : "";
    if (!name && payload.description === undefined) {
      return jsonResponse({ success: false, message: "No changes provided." }, 400, request);
    }

    const team = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; description: string | null }>(
        `
          update teams
          set
            name = coalesce($2, name),
            description = coalesce($3, description),
            updated_at = now()
          where id = $1
          returning id::text as id, name, description
        `,
        [Number(teamId), name || null, payload.description ?? null]
      );
      if (!result.rows.length) {
        throw new Error("Team not found.");
      }
      return result.rows[0];
    });

    return jsonResponse({ success: true, team }, 200, request);
  }

  if (method === "DELETE") {
    requirePermission(request, "manage_users");
    await withDbClient(async (client) => {
      await client.query("delete from teams where id = $1", [Number(teamId)]);
    });
    return jsonResponse({ success: true, message: "Team deleted." }, 200, request);
  }

  return notFound(request);
}

async function handlePropertyTypes(request: Request, method: string, segments: string[]) {
  requirePermission(request, "manage_users");

  if (segments.length === 2) {
    if (method === "GET") {
      const items = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; slug: string; property_count: string }>(
          `
            select
              pt.id::text as id,
              pt.name,
              pt.slug,
              count(p.id)::text as property_count
            from property_types pt
            left join properties p on p.property_type_id = pt.id and p.deleted_at is null
            group by pt.id
            order by pt.name asc
          `
        );
        return result.rows;
      });
      return jsonResponse({ success: true, items }, 200, request);
    }

    if (method === "POST") {
      const payload = await parseJson<{ name?: string }>(request);
      const name = String(payload.name || "").trim();
      if (!name) {
        return jsonResponse({ success: false, message: "Property type name is required." }, 400, request);
      }

      const propertyType = await withDbClient(async (client) => {
        const result = await client.query<{ id: string; name: string; slug: string }>(
          `
            insert into property_types (name, slug)
            values ($1, $2)
            returning id::text as id, name, slug
          `,
          [name, slugify(name)]
        );
        return result.rows[0];
      });

      return jsonResponse({ success: true, propertyType }, 201, request);
    }
  }

  const propertyTypeId = segments[2];
  if (!propertyTypeId) {
    return notFound(request);
  }

  if (method === "PUT") {
    const payload = await parseJson<{ name?: string }>(request);
    const name = String(payload.name || "").trim();
    if (!name) {
      return jsonResponse({ success: false, message: "Property type name is required." }, 400, request);
    }

    const propertyType = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; slug: string }>(
        `
          update property_types
          set name = $2, slug = $3
          where id = $1
          returning id::text as id, name, slug
        `,
        [Number(propertyTypeId), name, slugify(name)]
      );
      if (!result.rows.length) {
        throw new Error("Property type not found.");
      }
      return result.rows[0];
    });

    return jsonResponse({ success: true, propertyType }, 200, request);
  }

  if (method === "DELETE") {
    await withDbClient(async (client) => {
      await client.query("delete from property_types where id = $1", [Number(propertyTypeId)]);
    });
    return jsonResponse({ success: true, message: "Property type deleted." }, 200, request);
  }

  return notFound(request);
}
function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function handlePropertiesApi(request: Request, method: string, segments: string[]) {
  if (segments.length === 1) {
    if (method === "GET") {
      const items = await listApiProperties(50);
      const propertyTypes = await getPropertyTypeOptions();
      return jsonResponse({ ok: true, items, propertyTypes }, 200, request);
    }

    if (method === "POST") {
      const payload = await parseJson<Record<string, unknown>>(request);
      const property = await createProperty(payload as Parameters<typeof createProperty>[0]);
      return jsonResponse({ ok: true, property }, 201, request);
    }
  }

  if (segments[1] === "import" && method === "POST") {
    const form = await parseForm(request);
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: "File is required." }, 400, request);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return jsonResponse({ ok: false, error: "No worksheet found." }, 400, request);
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    const headers = rows.length ? Object.keys(rows[0]) : [];

    const aliases: Record<string, string[]> = {
      title: ["title", "name", "property title"],
      listingType: ["listing type", "listing_type", "listing"],
      propertyTypeId: ["property type id", "property_type_id", "property type"],
      locality: ["locality", "area"],
      city: ["city"],
      state: ["state"],
      addressLine1: ["address", "address line1", "address1"],
      pincode: ["pincode", "pin"],
      status: ["status"],
      possessionStatus: ["possession status", "possession_status"],
      priceAmount: ["price", "price amount", "price_amount"],
      rentAmount: ["rent", "rent amount", "rent_amount"],
      securityDeposit: ["security deposit", "security_deposit"],
      maintenanceAmount: ["maintenance", "maintenance amount", "maintenance_amount"],
      priceLabel: ["price label", "price_label"],
      bedrooms: ["bedrooms", "beds"],
      bathrooms: ["bathrooms", "baths"],
      balconies: ["balconies"],
      builtupArea: ["builtup area", "builtup_area"],
      builtupAreaUnit: ["builtup area unit", "builtup_area_unit"],
      parkingCount: ["parking", "parking count", "parking_count"],
      furnishingStatus: ["furnishing status", "furnishing_status"],
      coverImageUrl: ["cover image", "cover image url", "cover_image_url"]
    };

    const headerMap = new Map<string, string>();
    headers.forEach((header) => {
      const normalized = normalizeHeader(header);
      for (const [field, options] of Object.entries(aliases)) {
        if (options.includes(normalized)) {
          headerMap.set(field, header);
          break;
        }
      }
    });

    const propertyTypes = await getPropertyTypeOptions();
    const propertyTypeByName = new Map(
      propertyTypes.map((type) => [normalizeHeader(type.name), type.id])
    );
    const propertyTypeBySlug = new Map(
      propertyTypes.map((type) => [normalizeHeader(type.slug), type.id])
    );

    const imported: Array<{ row: number; propertyCode: string; slug: string }> = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const getValue = (field: string) => {
          const header = headerMap.get(field);
          return header ? row[header] : undefined;
        };

        const title = String(getValue("title") ?? "").trim();
        const listingType = String(getValue("listingType") ?? "").trim();
        const propertyTypeRaw = getValue("propertyTypeId");
        const locality = String(getValue("locality") ?? "").trim();

        if (!title || !listingType || !locality || !propertyTypeRaw) {
          throw new Error("Missing required fields (title, listingType, propertyType, locality).");
        }

        let propertyTypeId = Number(propertyTypeRaw);
        if (!Number.isFinite(propertyTypeId)) {
          const normalized = normalizeHeader(String(propertyTypeRaw));
          propertyTypeId = propertyTypeByName.get(normalized) || propertyTypeBySlug.get(normalized) || 0;
        }

        if (!propertyTypeId) {
          throw new Error("Invalid property type.");
        }

        const payload = {
          title,
          listingType,
          propertyTypeId,
          locality,
          city: String(getValue("city") ?? "").trim() || undefined,
          state: String(getValue("state") ?? "").trim() || undefined,
          addressLine1: String(getValue("addressLine1") ?? "").trim() || undefined,
          pincode: String(getValue("pincode") ?? "").trim() || undefined,
          status: String(getValue("status") ?? "").trim() || undefined,
          possessionStatus: String(getValue("possessionStatus") ?? "").trim() || undefined,
          priceAmount: toOptionalNumber(getValue("priceAmount")) ?? undefined,
          rentAmount: toOptionalNumber(getValue("rentAmount")) ?? undefined,
          securityDeposit: toOptionalNumber(getValue("securityDeposit")) ?? undefined,
          maintenanceAmount: toOptionalNumber(getValue("maintenanceAmount")) ?? undefined,
          priceLabel: String(getValue("priceLabel") ?? "").trim() || undefined,
          bedrooms: toOptionalNumber(getValue("bedrooms")) ?? undefined,
          bathrooms: toOptionalNumber(getValue("bathrooms")) ?? undefined,
          balconies: toOptionalNumber(getValue("balconies")) ?? undefined,
          builtupArea: toOptionalNumber(getValue("builtupArea")) ?? undefined,
          builtupAreaUnit: String(getValue("builtupAreaUnit") ?? "").trim() || undefined,
          parkingCount: toOptionalNumber(getValue("parkingCount")) ?? undefined,
          furnishingStatus: String(getValue("furnishingStatus") ?? "").trim() || undefined,
          coverImageUrl: String(getValue("coverImageUrl") ?? "").trim() || undefined,
          isFeatured: toOptionalBoolean(getValue("isFeatured")) ?? undefined,
          isVerified: toOptionalBoolean(getValue("isVerified")) ?? undefined
        };

        const created = await createProperty(payload);
        imported.push({ row: rowNumber, propertyCode: created.propertyCode, slug: created.slug });
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : "Failed to import row."
        });
      }
    }

    const mapping: Record<string, string | null> = {};
    headerMap.forEach((header, field) => {
      mapping[field] = header;
    });

    return jsonResponse(
      {
        ok: true,
        importedCount: imported.length,
        failedCount: errors.length,
        imported,
        errors,
        mapping,
        headers
      },
      200,
      request
    );
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404, request);
}

async function handleV1(request: Request, method: string, segments: string[]) {
  switch (segments[1]) {
    case "dashboard":
      return handleDashboard(request, method);
    case "leads":
      return handleLeads(request, method, segments);
    case "tasks":
      return handleTasks(request, method, segments);
    case "notifications":
      return handleNotifications(request, method, segments);
    case "projects":
      return handleProjectsEntity(request, method);
    case "reports":
      return handleReports(request, method, segments);
    case "search":
      return handleSearch(request, method);
    case "settings":
      return handleSettings(request, method, segments);
    case "users":
      return handleUsers(request, method, segments);
    case "roles":
      return handleRoles(request, method, segments);
    case "permissions":
      return handlePermissions(request, method);
    case "teams":
      return handleTeams(request, method, segments);
    case "property-types":
      return handlePropertyTypes(request, method, segments);
    default:
      return notFound(request);
  }
}

async function handleRequest(request: Request, context: RouteContext, method: string) {
  const params = await context.params;
  const segments = params?.path || [];
  if (!segments.length) {
    return notFound(request);
  }

  try {
    if (segments[0] === "v1") {
      return await handleV1(request, method, segments);
    }
    if (segments[0] === "properties") {
      return await handlePropertiesApi(request, method, segments);
    }
    return notFound(request);
  } catch (error) {
    if (segments[0] === "properties") {
      const message = error instanceof Error ? error.message : "Request failed.";
      return jsonResponse({ ok: false, error: message }, 500, request);
    }
    return buildErrorResponse(error, request);
  }
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "POST");
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "PUT");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "DELETE");
}
