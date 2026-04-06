import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { AuthError, ensureCrmAuthSchema, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

function slugifyRoleName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "manage_users");
    await ensureCrmAuthSchema();

    const { id } = await context.params;
    const roleId = Number(id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new Error("Invalid role identifier.");
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw new Error("Role name is required.");
    }

    const slug = slugifyRoleName(name);
    if (!slug) {
      throw new Error("Role name must contain letters or numbers.");
    }

    const role = await withDbClient(async (client) => {
      const existing = await client.query<{ id: string }>(
        "select id::text as id from roles where id = $1 limit 1",
        [roleId]
      );

      if (!existing.rows.length) {
        throw new Error("Role not found.");
      }

      const duplicate = await client.query<{ id: string }>(
        "select id::text as id from roles where (lower(name) = lower($1) or slug = $2) and id <> $3 limit 1",
        [name, slug, roleId]
      );

      if (duplicate.rows.length) {
        throw new Error("A role with this name already exists.");
      }

      const result = await client.query<{ id: string; name: string; slug: string; user_count: string }>(
        `
          update roles
          set name = $1, slug = $2
          where id = $3
          returning
            id::text as id,
            name,
            slug,
            (
              select count(*)::text
              from users u
              where u.role_id = roles.id
            ) as user_count
        `,
        [name, slug, roleId]
      );

      return result.rows[0];
    });

    return withCors(NextResponse.json({ success: true, role }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to update role."
        },
        { status }
      ),
      request
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requirePermission(request, "manage_users");
    await ensureCrmAuthSchema();

    const { id } = await context.params;
    const roleId = Number(id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new Error("Invalid role identifier.");
    }

    await withDbClient(async (client) => {
      const inUse = await client.query<{ count: string }>(
        "select count(*)::text as count from users where role_id = $1",
        [roleId]
      );

      if (Number(inUse.rows[0]?.count ?? 0) > 0) {
        throw new Error("This role is assigned to users. Reassign them before deleting the role.");
      }

      const deleted = await client.query<{ id: string }>(
        "delete from roles where id = $1 returning id::text as id",
        [roleId]
      );

      if (!deleted.rows.length) {
        throw new Error("Role not found.");
      }
    });

    return withCors(NextResponse.json({ success: true, message: "Role deleted successfully." }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to delete role."
        },
        { status }
      ),
      request
    );
  }
}
