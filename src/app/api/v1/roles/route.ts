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

export async function GET(request: Request) {
  try {
    await ensureCrmAuthSchema();
    const roles = await withDbClient(async (client) => {
      const result = await client.query<{ id: string; name: string; slug: string; user_count: string }>(
        `
          select
            r.id::text as id,
            r.name,
            r.slug,
            count(u.id)::text as user_count
          from roles r
          left join users u on u.role_id = r.id
          group by r.id, r.name, r.slug
          order by r.name
        `
      );
      return result.rows;
    });

    return withCors(
      NextResponse.json({
        success: true,
        items: roles
      }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to load roles."
      },
      { status: 500 }
    ),
      request
    );
  }
}

export async function POST(request: Request) {
  try {
    requirePermission(request, "manage_users");
    await ensureCrmAuthSchema();

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
        "select id::text as id from roles where lower(name) = lower($1) or slug = $2 limit 1",
        [name, slug]
      );

      if (existing.rows.length) {
        throw new Error("A role with this name already exists.");
      }

      const result = await client.query<{ id: string; name: string; slug: string; user_count: string }>(
        `
          insert into roles (name, slug)
          values ($1, $2)
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
        [name, slug]
      );

      return result.rows[0];
    });

    return withCors(
      NextResponse.json({
        success: true,
        role,
        message: "Role created successfully."
      }),
      request
    );
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    return withCors(
      NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : "Unable to create role."
        },
        { status }
      ),
      request
    );
  }
}
