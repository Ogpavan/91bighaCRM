import { NextResponse } from "next/server";
import { withDbClient } from "@/lib/db";
import { AuthError, ensureCrmAuthSchema, requirePermission } from "@/lib/crm-auth";
import { createCorsPreflightResponse, withCors } from "@/lib/cors";

type RouteContext = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    requirePermission(request, "manage_users");
    await ensureCrmAuthSchema();

    const { id } = await context.params;
    const roleId = Number(id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new Error("Invalid role identifier.");
    }

    const items = await withDbClient(async (client) => {
      const roleResult = await client.query<{ id: string }>("select id::text as id from roles where id = $1 limit 1", [roleId]);
      if (!roleResult.rows.length) {
        throw new Error("Role not found.");
      }

      const result = await client.query<{ key: string }>(
        `
          select
            p.permission_key as key
          from role_permissions rp
          join permissions p on p.id = rp.permission_id
          where rp.role_id = $1
          order by p.permission_key asc
        `,
        [roleId]
      );
      return result.rows.map((row) => row.key);
    });

    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to load role permissions."
        },
        { status }
      ),
      request
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requirePermission(request, "manage_users");
    await ensureCrmAuthSchema();

    const { id } = await context.params;
    const roleId = Number(id);
    if (!Number.isInteger(roleId) || roleId <= 0) {
      throw new Error("Invalid role identifier.");
    }

    const body = (await request.json()) as { permissionKeys?: unknown[] };
    const permissionKeys = Array.isArray(body.permissionKeys)
      ? body.permissionKeys.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];

    const items = await withDbClient(async (client) => {
      const roleResult = await client.query<{ id: string; name: string }>(
        "select id::text as id, name from roles where id = $1 limit 1",
        [roleId]
      );
      if (!roleResult.rows.length) {
        throw new Error("Role not found.");
      }

      const permissionsResult = await client.query<{ permission_key: string }>(
        `
          select permission_key
          from permissions
          where permission_key = any($1::text[])
        `,
        [permissionKeys]
      );
      const validPermissionKeys = permissionsResult.rows.map((row) => row.permission_key);

      if (validPermissionKeys.length !== permissionKeys.length) {
        throw new Error("One or more permissions are invalid.");
      }

      await client.query("begin");

      try {
        await client.query("delete from role_permissions where role_id = $1", [roleId]);

        if (validPermissionKeys.length) {
          await client.query(
            `
              insert into role_permissions (role_id, permission_id)
              select $1, p.id
              from permissions p
              where p.permission_key = any($2::text[])
            `,
            [roleId, validPermissionKeys]
          );
        }

        await client.query("commit");
        return validPermissionKeys.sort();
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });

    return withCors(NextResponse.json({ success: true, items }), request);
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to update role permissions."
        },
        { status }
      ),
      request
    );
  }
}
