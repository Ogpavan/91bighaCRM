import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";
import { ensureCrmLeadsSchema } from "@/lib/crm-leads";
import { ensureCrmTasksSchema } from "@/lib/crm-tasks";
import { ensureProjectsEntitySchema } from "@/lib/projects-entity";

type SearchActor = {
  userId: string;
  role: string;
  permissions: string[];
};

type SearchRow = {
  id: string;
  label: string;
  sublabel: string | null;
  type: string;
  href: string;
  sort_group: number;
};

function hasPermission(actor: SearchActor, permissionKey: string) {
  return actor.permissions.includes(permissionKey);
}

function isElevatedRole(role: string) {
  return role === "Admin" || role === "SalesManager";
}

export async function searchGlobal(query: string, actor: SearchActor) {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  await ensureCrmAuthSchema();
  await ensureCrmLeadsSchema();
  await ensureCrmTasksSchema();
  await ensureProjectsEntitySchema();

  return withDbClient(async (client) => {
    const rows: SearchRow[] = [];
    const likeValue = `%${normalized}%`;

    if (hasPermission(actor, "view_leads")) {
      const params: unknown[] = [likeValue];
      const leadScope = isElevatedRole(actor.role)
        ? ""
        : (() => {
            params.push(Number(actor.userId));
            return ` and (l.created_by = $${params.length} or coalesce(l.telecaller_id, l.assigned_to) = $${params.length})`;
          })();
      const result = await client.query<SearchRow>(
        `
          select
            l.id::text as id,
            l.name as label,
            concat_ws(' · ', coalesce(l.mobile_number, l.phone), s.name, st.name) as sublabel,
            'lead' as type,
            '/leads/' || l.id::text as href,
            1 as sort_group
          from crm_leads l
          join crm_lead_sources s on s.id = l.source_id
          join crm_lead_statuses st on st.id = l.status_id
          where l.is_deleted = false
            and (
              l.name ilike $1
              or coalesce(l.mobile_number, l.phone, '') ilike $1
              or coalesce(l.whatsapp_number, '') ilike $1
            )${leadScope}
          order by l.created_at desc
          limit 6
        `,
        params
      );
      rows.push(...result.rows);
    }

    if (hasPermission(actor, "view_tasks")) {
      const params: unknown[] = [likeValue];
      const scopeClause = isElevatedRole(actor.role)
        ? ""
        : (() => {
            params.push(Number(actor.userId));
            return ` and (t.assigned_to = $${params.length} or t.created_by = $${params.length})`;
          })();

      const result = await client.query<SearchRow>(
        `
          select
            t.id::text as id,
            t.title as label,
            concat_ws(' · ', t.status, t.priority, assigned_user.name) as sublabel,
            'task' as type,
            '/tasks/' || t.id::text as href,
            2 as sort_group
          from crm_tasks t
          join users assigned_user on assigned_user.id = t.assigned_to
          where t.is_deleted = false
            and (
              t.title ilike $1
              or coalesce(t.description, '') ilike $1
            )${scopeClause}
          order by t.updated_at desc nulls last, t.created_at desc
          limit 6
        `,
        params
      );
      rows.push(...result.rows);
    }

    if (hasPermission(actor, "view_users")) {
      const result = await client.query<SearchRow>(
        `
          select
            u.id::text as id,
            u.name as label,
            concat_ws(' · ', u.email, r.name, t.name) as sublabel,
            'user' as type,
            '/users' as href,
            3 as sort_group
          from users u
          join roles r on r.id = u.role_id
          left join teams t on t.id = u.team_id
          where
            u.name ilike $1
            or u.email ilike $1
            or coalesce(u.phone, '') ilike $1
          order by u.created_at desc
          limit 6
        `,
        [likeValue]
      );
      rows.push(...result.rows);
    }

    {
      const result = await client.query<SearchRow>(
        `
          select
            p.id::text as id,
            p.title as label,
            concat_ws(' · ', p.property_type, p.locality, p.city) as sublabel,
            'property' as type,
            '/properties' as href,
            4 as sort_group
          from properties p
          where p.deleted_at is null
            and (
              p.title ilike $1
              or p.property_code ilike $1
              or coalesce(p.locality, '') ilike $1
              or coalesce(p.city, '') ilike $1
            )
          order by coalesce(p.published_at, p.created_at) desc
          limit 6
        `,
        [likeValue]
      );
      rows.push(...result.rows);
    }

    {
      const result = await client.query<SearchRow>(
        `
          select
            p.id::text as id,
            p.name as label,
            concat_ws(' · ', p.project_code, p.location, p.status) as sublabel,
            'project' as type,
            '/projects' as href,
            5 as sort_group
          from projects p
          where
            p.name ilike $1
            or p.project_code ilike $1
            or coalesce(p.location, '') ilike $1
          order by p.created_at desc
          limit 6
        `,
        [likeValue]
      );
      rows.push(...result.rows);
    }

    return rows
      .sort((a, b) => a.sort_group - b.sort_group || a.label.localeCompare(b.label))
      .slice(0, 12)
      .map((row) => ({
        id: row.id,
        label: row.label,
        sublabel: row.sublabel,
        type: row.type,
        href: row.href
      }));
  });
}
